import type { ConsumeType } from "~app/utils/consume-type";
import type { PeerId, ReceiptItemId } from "~db/ids";

export type { Participant } from "~app/hooks/use-participants";

export type { ConsumeType } from "~app/utils/consume-type";

export type Item = {
	id: ReceiptItemId;
	name: string;
	price: number;
	quantity: number;
	consumeType: ConsumeType | null;
	consumers: {
		part: number;
		peerId: PeerId;
		createdAt: Temporal.ZonedDateTime;
	}[];
	payers: {
		part: number;
		peerId: PeerId;
		createdAt: Temporal.ZonedDateTime;
	}[];
	createdAt: Temporal.ZonedDateTime;
};

export type Payer = Item["consumers"][number];
