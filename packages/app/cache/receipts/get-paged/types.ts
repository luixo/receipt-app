import {
	TRPCInfiniteQueryInput,
	TRPCInfiniteQueryCursor,
	TRPCQueryOutput,
} from "app/trpc";

export type ReceiptsResult = TRPCQueryOutput<"receipts.get-paged">;
export type Receipt = ReceiptsResult["items"][number];
export type ReceiptsGetPagedInput =
	TRPCInfiniteQueryInput<"receipts.get-paged">;
export type ReceiptsGetPagedCursor =
	TRPCInfiniteQueryCursor<"receipts.get-paged">;
