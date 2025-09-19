import type { QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";

import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, getAllInputs } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["receipts"]["getPaged"];
}>;
type Output = TRPCQueryOutput<"receipts.getPaged">;
type OutputItem = Output["items"][number];

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
	(updater: UpdateFn<OutputItem[], OutputItem[], QueryKey>) => {
		const snapshots: {
			queryKey: QueryKey;
			items: OutputItem[];
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
					items.some((item) => item.id === receiptId)
						? items.filter((item) => item.id !== receiptId)
						: items,
				(snapshots) => (items, queryKey) => {
					const matchedSnapshot = snapshots.find(
						(snapshot) => hashKey(snapshot.queryKey) === hashKey(queryKey),
					);
					if (!matchedSnapshot) {
						return items;
					}
					const lastIndex = matchedSnapshot.items.findIndex(
						(item) => item.id === receiptId,
					);
					const matchedItem = matchedSnapshot.items[lastIndex];
					if (!matchedItem) {
						return items;
					}
					return [
						...items.slice(0, lastIndex),
						matchedItem,
						...items.slice(lastIndex),
					];
				},
			),
	};
};
