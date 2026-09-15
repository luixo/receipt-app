import type { ReceiptItemId, UserId } from "~db/ids";

export type { Participant } from "~app/hooks/use-participants";

export type Item = {
	id: ReceiptItemId;
	name: string;
	price: number;
	quantity: number;
	consumers: {
		part: number;
		userId: UserId;
		createdAt: Temporal.ZonedDateTime;
	}[];
	payers: {
		part: number;
		userId: UserId;
		createdAt: Temporal.ZonedDateTime;
	}[];
	createdAt: Temporal.ZonedDateTime;
};

export type Payer = Item["consumers"][number];
