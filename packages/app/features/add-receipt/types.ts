import type { Currency } from "app/utils/currency";

export type Form = {
	name: string;
	currency: Currency;
	issued: Date;
};
