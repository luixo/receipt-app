import type { ReceiptId } from "~db/ids";

import type { ControllerContext } from "../../types";
import { applyWithRevert } from "../utils";

import { getAllReceiptsListCollections } from "./collections";

const refetchAll = (
	collections: ReturnType<typeof getAllReceiptsListCollections>,
) => collections.map((collection) => collection.utils.refetch());

const removeFromAllLists = (
	collections: ReturnType<typeof getAllReceiptsListCollections>,
	receiptId: ReceiptId,
) => {
	const affected = collections.filter((collection) =>
		collection.has(receiptId),
	);
	for (const collection of affected) {
		collection.utils.writeDelete(receiptId);
	}
	return affected.length === 0 ? undefined : affected;
};

export const getController = ({ queryClient }: ControllerContext) => ({
	invalidate: () => refetchAll(getAllReceiptsListCollections(queryClient)),
});

export const getRevertController = ({ queryClient }: ControllerContext) => ({
	remove: (receiptId: ReceiptId) => {
		const collections = getAllReceiptsListCollections(queryClient);
		return applyWithRevert(
			() => removeFromAllLists(collections, receiptId),
			() => {
				void refetchAll(collections);
			},
		);
	},
});
