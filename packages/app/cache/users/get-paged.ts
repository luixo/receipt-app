import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import * as utils from "app/cache/utils";
import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { trpc } from "app/trpc";
import type { ItemWithIndex } from "app/utils/array";
import { removeFromArray, replaceInArray } from "app/utils/array";
import type { UsersId } from "next-app/src/db/models";

type Controller = TRPCReactContext["users"]["getPaged"];

type UserPage = TRPCQueryOutput<"users.getPaged">;
type User = UserPage["items"][number];
type Input = TRPCQueryInput<"users.getPaged">;

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

const getPagedInputs = (queryClient: QueryClient) =>
	utils.getAllInputs<"users.getPaged">(
		queryClient,
		getQueryKey(trpc.users.getPaged),
	);

const updatePages = (
	controller: Controller,
	inputs: Input[],
	updater: (page: User[], count: number, input: Input) => [User[], number],
) => {
	inputs.forEach((input) => {
		controller.setData(input, (result) => {
			if (!result) {
				return;
			}
			const [nextItems, nextCount] = updater(result.items, result.count, input);
			if (nextItems === result.items && nextCount === result.count) {
				return result;
			}
			return { ...result, items: nextItems, count: nextCount };
		});
	});
};

const update =
	(controller: Controller, inputs: Input[], userId: UsersId) =>
	(updater: utils.UpdateFn<User>) =>
		utils.withRef<User | undefined>((ref) =>
			updatePages(controller, inputs, (page, count) => [
				replaceInArray(page, (user) => user.id === userId, updater, ref),
				count,
			]),
		).current;

const add = (controller: Controller, inputs: Input[], nextUser: User) =>
	utils.withRef<number | undefined>((ref) =>
		updatePages(controller, inputs, (page, count, input) => {
			if (ref.current !== undefined) {
				return [page, count + 1];
			}
			const sortedPage = [...page, nextUser].sort(sortByName);
			const sortedIndex = sortedPage.indexOf(nextUser);
			if (sortedIndex === 0) {
				if (input.cursor === 0) {
					// We have an item in the beginning of the first page
					// We can trust it is it's actual location
					ref.current = input.cursor;
					return [sortedPage, count + 1];
				}
				// The beginning of the page - probably should fit on the previous page
				return [page, count];
			}
			if (sortedIndex === sortedPage.length - 1) {
				// The end of the page - probably should fit on the next page
				return [page, count];
			}
			ref.current = input.cursor;
			return [sortedPage.slice(0, input.limit), count + 1];
		}),
	).current;

const remove = (controller: Controller, inputs: Input[], userId: UsersId) => {
	const cursorRef = utils.createRef<number>(-1);
	const removedItem = utils.withRef<ItemWithIndex<User> | undefined>((ref) =>
		updatePages(controller, inputs, (page, count, input) => {
			if (ref.current) {
				return [page, count - 1];
			}
			const nextPage = removeFromArray(
				page,
				(user) => {
					const match = user.id === userId;
					if (!match) {
						return false;
					}
					cursorRef.current = input.cursor;
					return true;
				},
				ref,
			);
			if (nextPage.length === page.length) {
				return [page, count];
			}
			return [nextPage, count - 1];
		}),
	).current;
	if (removedItem) {
		return {
			...removedItem,
			cursor: cursorRef.current,
		};
	}
};

const invalidate =
	(controller: Controller, inputs: Input[]) =>
	(sinceCursor: number = 0) =>
		utils.withRef<UserPage[]>((ref) => {
			inputs
				.filter((input) => input.cursor >= sinceCursor)
				.forEach((input) => {
					const page = controller.getData(input);
					if (!page) {
						return;
					}
					ref.current.push(page);
					controller.invalidate(input, { refetchType: "all" });
				});
		}, []).current;

export const getController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		add: (user: User) => add(controller, inputs, user),
		update: (userId: UsersId, updater: utils.UpdateFn<User>) =>
			update(controller, inputs, userId)(updater),
		remove: (userId: UsersId) => remove(controller, inputs, userId),
		invalidate: (sinceCursor?: number) =>
			invalidate(controller, inputs)(sinceCursor),
	};
};

export const getRevertController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		add: (user: User) =>
			// TODO: add paged invalidation on adding a user
			utils.applyWithRevert(
				() => add(controller, inputs, user),
				() => remove(controller, inputs, user.id),
			),
		update: (
			userId: UsersId,
			updater: utils.UpdateFn<User>,
			revertUpdater: utils.SnapshotFn<User>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, inputs, userId),
				updater,
				revertUpdater,
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, inputs, userId),
				({ item }) => add(controller, inputs, item),
			),
		invalidate: (sinceCursor?: number) =>
			invalidate(controller, inputs)(sinceCursor),
	};
};
