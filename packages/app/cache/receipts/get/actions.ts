import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, ReceiptsGetInput } from "./types";

export const add = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	receipt: Receipt
) => createController(trpc, input).set(receipt);

export const remove = (trpc: TRPCReactContext, input: ReceiptsGetInput) =>
	createController(trpc, input).invalidate();

export const update = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	updater: (user: Receipt) => Receipt
) => {
	const modifiedReceiptRef = createRef<Receipt | undefined>();
	createController(trpc, input).update((user) => {
		modifiedReceiptRef.current = user;
		return updater(user);
	});
	return modifiedReceiptRef.current;
};
