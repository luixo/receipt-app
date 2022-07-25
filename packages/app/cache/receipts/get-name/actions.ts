import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { createController } from "./controller";

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	nextName: string
) => createController(trpc, receiptId).set(nextName);

export const remove = (trpc: TRPCReactContext, receiptId: ReceiptsId) =>
	createController(trpc, receiptId).invalidate();
