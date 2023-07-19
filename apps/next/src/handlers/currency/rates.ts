import { z } from "zod";

import { CurrencyCode } from "app/utils/currency";
import { cacheDatabase } from "next-app/cache-db";
import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema } from "next-app/handlers/validation";
import { getExchangeRate } from "next-app/providers/exchange-rate";

// Minutes
const CACHE_TTL = 60;

const getKey = (from: CurrencyCode, to: CurrencyCode[]): string =>
	`${from}->${[...to].sort().join(",")}`;

export const procedure = authProcedure
	.input(
		z.strictObject({
			from: currencyCodeSchema,
			to: currencyCodeSchema.array(),
		})
	)
	.query(async ({ input }) => {
		const cacheKey = getKey(input.from, input.to);
		const cachedRates = await cacheDatabase.get<Record<CurrencyCode, number>>(
			cacheKey
		);
		if (cachedRates) {
			return cachedRates;
		}
		const fetchedRates = await getExchangeRate(input.from, input.to);
		cacheDatabase.setex(cacheKey, CACHE_TTL, fetchedRates);
		return fetchedRates;
	});
