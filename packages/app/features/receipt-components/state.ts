import type { PeerId, ReceiptItemId } from "#db/ids.ts";

export type { Participant } from "#app/hooks/use-participants.ts";

export type Item = {
	id: ReceiptItemId;
	name: string;
	price: number;
	quantity: number;
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
