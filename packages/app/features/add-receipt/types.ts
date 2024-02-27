import type { CurrencyCode } from "app/utils/currency";

export type Form = {
	name: string;
	currencyCode: CurrencyCode;
	issued: Date;
};
