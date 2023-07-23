import * as utils from "app/cache/utils";
import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { UsersId } from "next-app/src/db/models";

type Controller = utils.GenericController<"users.getPaged">;

type UserPage = TRPCQueryOutput<"users.getPaged">;
type User = UserPage["items"][number];
type Input = TRPCQueryInput<"users.getPaged">;

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

const updatePages = (
	controller: Controller,
	updater: (page: User[], count: number, input: Input) => [User[], number],
) =>
	controller.update((input, result) => {
		const [nextItems, nextCount] = updater(result.items, result.count, input);
		if (nextItems === result.items && nextCount === result.count) {
			return result;
		}
		return { ...result, items: nextItems, count: nextCount };
	});

const update =
	(controller: Controller, userId: UsersId) =>
	(updater: utils.UpdateFn<User>) =>
		utils.withRef<User | undefined>((ref) =>
			updatePages(controller, (page, count) => [
				replaceInArray(page, (user) => user.id === userId, updater, ref),
				count,
			]),
		).current;

const add = (controller: Controller, nextUser: User) =>
	utils.withRef<number | undefined>((ref) =>
		updatePages(controller, (page, count, input) => {
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

const remove = (controller: Controller, userId: UsersId) => {
	const cursorRef = utils.createRef<number>(-1);
	const removedItem = utils.withRef<ItemWithIndex<User> | undefined>((ref) =>
		updatePages(controller, (page, count, input) => {
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
	(controller: Controller) =>
	(sinceCursor: number = 0) =>
		utils.withRef<UserPage[]>(
			(ref) =>
				controller.invalidate(
					(input, page) => {
						const match = input.cursor >= sinceCursor;
						if (!match) {
							return false;
						}
						ref.current.push(page);
						return true;
					},
					{ refetchType: "all" },
				),
			[],
		).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.getPaged");
	return {
		add: (user: User) => add(controller, user),
		update: (userId: UsersId, updater: utils.UpdateFn<User>) =>
			update(controller, userId)(updater),
		remove: (userId: UsersId) => remove(controller, userId),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.getPaged");
	return {
		add: (user: User) =>
			// TODO: add paged invalidation on adding a user
			utils.applyWithRevert(
				() => add(controller, user),
				() => remove(controller, user.id),
			),
		update: (
			userId: UsersId,
			updater: utils.UpdateFn<User>,
			revertUpdater: utils.SnapshotFn<User>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, userId),
				updater,
				revertUpdater,
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				({ item }) => add(controller, item),
			),
		invalidate: invalidate(controller),
	};
};
