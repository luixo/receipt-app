import type { Direction } from "app/components/app/sign-button-group";
import type { Currency } from "app/utils/currency";
import type { UsersId } from "next-app/db/models";

export type Form = {
	amount: number;
	direction: Direction;
	currency: Currency;
	userId: UsersId;
	note: string;
	timestamp: Date;
};
