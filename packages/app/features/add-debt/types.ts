import type { Direction } from "app/components/app/sign-button-group";
import type { CurrencyCode } from "app/utils/currency";
import type { UsersId } from "next-app/db/models";

export type Form = {
	amount: number;
	direction: Direction;
	currencyCode: CurrencyCode;
	userId: UsersId;
	note: string;
	timestamp: Date;
};
