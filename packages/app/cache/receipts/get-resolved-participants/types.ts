import { TRPCQueryOutput } from "app/trpc";

export type ReceiptParticipants =
	TRPCQueryOutput<"receipts.get-resolved-participants">;
