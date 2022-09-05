import { TRPCQueryOutput } from "app/trpc";

export type ReceiptItemsResult = TRPCQueryOutput<"receiptItems.get">;
export type ReceiptItem = ReceiptItemsResult["items"][number];
export type ReceiptParticipant = ReceiptItemsResult["participants"][number];
export type ReceiptItemPart = ReceiptItem["parts"][number];
