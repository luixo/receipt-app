import { z } from "zod";

import type { CurrencyCode } from "app/utils/currency";
import { getCacheDatabase } from "next-app/cache-db";
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
		}),
	)
	.query(async ({ ctx, input }) => {
		const cacheKey = getKey(input.from, input.to);
		const cacheDatabase = getCacheDatabase(ctx);
		const cachedRates = await cacheDatabase.get<Record<CurrencyCode, number>>(
			cacheKey,
		);
		if (cachedRates) {
			return cachedRates;
		}
		const fetchedRates = await getExchangeRate(input.from, input.to);
		cacheDatabase.setex(cacheKey, CACHE_TTL, fetchedRates);
		return fetchedRates;
	});
