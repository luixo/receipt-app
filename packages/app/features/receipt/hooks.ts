import type { Item, Participant } from "~app/features/receipt-components/state";
import { useParticipants } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptsId, UsersId } from "~db/models";

export type ReceiptContext = {
	receiptId: ReceiptsId;
	name: string;
	currencyCode: CurrencyCode;
	issued: Date;
	selfUserId: UsersId;

	receiptDisabled: boolean;
	participantsDisabled: boolean;

	items: Item[];
	participants: Participant[];
};

export const useGetReceiptContext = (
	receipt: TRPCQueryOutput<"receipts.get">,
	receiptDisabled: boolean,
): ReceiptContext => {
	const { participants } = useParticipants(receipt);
	return {
		receiptId: receipt.id,
		selfUserId: receipt.selfUserId,
		currencyCode: receipt.currencyCode,
		name: receipt.name,
		issued: receipt.issued,
		receiptDisabled,
		participantsDisabled: Boolean(receipt.transferIntentionUserId),
		items: receipt.items,
		participants,
	};
};
