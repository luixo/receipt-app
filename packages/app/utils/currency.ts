import type { z } from "zod";

import type { currencySchema } from "~app/utils/validation";

export type CurrencyCode = string & {
	__flavor?: "currencyCode";
};

export type Currency = z.infer<typeof currencySchema>;

export const renderCurrencyName = (
	currencyCode: CurrencyCode,
	currency?: Currency | undefined,
) =>
	currency
		? `${currency.name} (${currencyCode}${
				currencyCode === currency.symbol ? "" : ` / ${currency.symbol}`
		  })`
		: currencyCode;
