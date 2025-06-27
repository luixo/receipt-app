import type { QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";

import type { ReceiptsId } from "~db/models";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, getAllInputs } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["receipts"]["getPaged"];
}>;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"receipts.getPaged">(
		queryClient,
		procedure.queryKey(),
	);
	return inputs.map((input) =>
		queryClient.invalidateQueries(procedure.queryFilter(input)),
	);
};

const updatePages =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<ReceiptsId[], ReceiptsId[], QueryKey>) => {
		const snapshots: {
			queryKey: QueryKey;
			items: ReceiptsId[];
		}[] = [];
		const inputs = getAllInputs<"receipts.getPaged">(
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
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		remove: (receiptId: ReceiptsId) =>
			applyUpdateFnWithRevert(
				updatePages(controller),
				(items) =>
					items.includes(receiptId)
						? items.filter((item) => item !== receiptId)
						: items,
				(snapshots) => (items, queryKey) => {
					const matchedSnapshot = snapshots.find(
						(snapshot) => hashKey(snapshot.queryKey) === hashKey(queryKey),
					);
					if (!matchedSnapshot) {
						return items;
					}
					const lastIndex = matchedSnapshot.items.indexOf(receiptId);
					return [
						...items.slice(0, lastIndex),
						receiptId,
						...items.slice(lastIndex),
					];
				},
			),
	};
};
