import type { QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";

import type { UsersId } from "~db/models";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, getAllInputs } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["users"]["getPaged"];
}>;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"users.getPaged">(
		queryClient,
		procedure.queryKey(),
	);
	return inputs.map((input) =>
		queryClient.invalidateQueries(procedure.queryFilter(input)),
	);
};

const updatePages =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<UsersId[], UsersId[], QueryKey>) => {
		const snapshots: {
			queryKey: QueryKey;
			items: UsersId[];
		}[] = [];
		const inputs = getAllInputs<"users.getPaged">(
			queryClient,
			procedure.queryKey(),
		);
		inputs.forEach((input) => {
			const queryKey = procedure.queryKey(input);
			queryClient.setQueryData(queryKey, (result) => {
				if (!result) {
					return;
				}
				const nextItems = updater(result.items, queryKey);
				if (nextItems === result.items) {
					return result;
				}
				snapshots.push({
					queryKey,
					items: result.items,
				});
				return { ...result, items: nextItems };
			});
		});
		return snapshots;
	};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		remove: (userId: UsersId) =>
			applyUpdateFnWithRevert(
				updatePages(controller),
				(items) =>
					items.includes(userId)
						? items.filter((item) => item !== userId)
						: items,
				(snapshots) => (items, queryKey) => {
					const matchedSnapshot = snapshots.find(
						(snapshot) => hashKey(snapshot.queryKey) === hashKey(queryKey),
					);
					if (!matchedSnapshot) {
						return items;
					}
					const lastIndex = matchedSnapshot.items.indexOf(userId);
					return [
						...items.slice(0, lastIndex),
						userId,
						...items.slice(lastIndex),
					];
				},
			),
	};
};
