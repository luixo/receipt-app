import fetch from "isomorphic-fetch";
import { z } from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getCacheDatabase } from "~web/providers/cache-db";

export type ExchangeRateOptions = {
	mock?: {
		fn: (from: CurrencyCode, to: CurrencyCode) => Promise<number>;
	};
};

// see https://github.com/fawazahmed0/currency-api
const BASE_URL = `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/`;

const getExchangeRate = async (
	ctx: UnauthorizedContext,
	fromCode: CurrencyCode,
	toCode: CurrencyCode,
) => {
	if (ctx.exchangeRateOptions.mock) {
		return ctx.exchangeRateOptions.mock.fn(fromCode, toCode);
	}
	const fromCodeLower = fromCode.toLowerCase();
	const toCodeLower = toCode.toLowerCase();
	const response = await fetch(
		`${BASE_URL}latest/currencies/${fromCodeLower}/${toCodeLower}.min.json`,
	);
	if (response.status !== 200) {
		throw new Error(`Response to exchange rate request is ${response.status}`);
	}
	const json = await response.json();
	const parsedJson = z
		.object({
			date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
			[toCodeLower]: z.number(),
		})
		.safeParse(json);
	if (!parsedJson.success) {
		throw parsedJson.error;
	}
	return Number((parsedJson.data[toCodeLower] as number).toFixed(6));
};

// Minutes
const CACHE_TTL = 24 * 60;

const getKey = (fromCode: CurrencyCode, toCode: CurrencyCode): string =>
	`${fromCode}->${toCode}`;

export const getExchangeRates = async (
	ctx: UnauthorizedContext,
	fromCode: CurrencyCode,
	toCodes: CurrencyCode[],
): Promise<Record<CurrencyCode, number>> => {
	const cacheDatabase = getCacheDatabase(ctx);
	const data = await Promise.all(
		toCodes.map(async (toCode) => {
			const cacheKey = getKey(fromCode, toCode);
			const cachedRate = await cacheDatabase.get<Record<CurrencyCode, number>>(
				cacheKey,
			);
			if (cachedRate) {
				return { code: toCode, value: cachedRate };
			}
			const fetchedRate = await getExchangeRate(ctx, fromCode, toCode);
			cacheDatabase.setex(cacheKey, CACHE_TTL, fetchedRate).catch((e) => {
				// Failing on this action doesn't matter much
				ctx.logger.warn("Cache DB setex action failed", e);
			});
			return { code: toCode, value: fetchedRate };
		}),
	);
	return data.reduce<Record<CurrencyCode, number>>(
		(acc, { code, value }) => ({ ...acc, [code]: value }),
		{},
	);
};
