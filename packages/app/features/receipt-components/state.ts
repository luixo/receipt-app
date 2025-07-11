import type { ReceiptItemsId, UsersId } from "~db/models";
import type { Temporal } from "~utils/date";

export type { Participant } from "~app/hooks/use-participants";

export type Item = {
	id: ReceiptItemsId;
	name: string;
	price: number;
	quantity: number;
	consumers: {
		part: number;
		userId: UsersId;
		createdAt: Temporal.ZonedDateTime;
	}[];
	createdAt: Temporal.ZonedDateTime;
};

export type Payer = Item["consumers"][number];
