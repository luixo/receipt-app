import type { ReceiptItemsId, UsersId } from "~db/models";

export type { Participant } from "~app/hooks/use-participants";

export type Item = {
	id: ReceiptItemsId;
	name: string;
	price: number;
	quantity: number;
	parts: {
		part: number;
		userId: UsersId;
	}[];
	createdAt: Date;
};
