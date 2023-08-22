import fetch from "isomorphic-fetch";
import { z } from "zod";

import type { CurrencyCode } from "app/utils/currency";
import { currencyCodeSchema } from "app/utils/validation";

const responseSchema = z.object({
	success: z.literal(true),
	base: currencyCodeSchema,
	date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
	rates: z.record(currencyCodeSchema, z.number()),
});

export const getExchangeRate = async (
	from: CurrencyCode,
	to: CurrencyCode[],
): Promise<Record<CurrencyCode, number>> => {
	const response = await fetch(
		`https://api.exchangerate.host/latest?base=${from}&symbols=${to.join(",")}`,
	);
	if (response.status !== 200) {
		throw new Error(`Response to exchange rate request is ${response.status}`);
	}
	const json = await response.json();
	const parsedJson = responseSchema.safeParse(json);
	if (!parsedJson.success) {
		throw parsedJson.error;
	}
	return parsedJson.data.rates;
};
