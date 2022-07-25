import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { createController } from "./controller";
import { Receipt } from "./types";

export const add = (trpc: TRPCReactContext, receipt: Receipt) =>
	createController(trpc, receipt.id).set(receipt);

export const remove = (trpc: TRPCReactContext, receiptId: ReceiptsId) =>
	createController(trpc, receiptId).invalidate();

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (user: Receipt) => Receipt
) => {
	const modifiedReceiptRef = createRef<Receipt | undefined>();
	createController(trpc, receiptId).update((user) => {
		modifiedReceiptRef.current = user;
		return updater(user);
	});
	return modifiedReceiptRef.current;
};
