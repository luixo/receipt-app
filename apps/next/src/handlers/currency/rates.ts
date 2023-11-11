import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { CurrencyCode } from "app/utils/currency";
import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema } from "next-app/handlers/validation";
import { getCacheDatabase } from "next-app/providers/cache-db";
import { getExchangeRate } from "next-app/providers/exchange-rate";

// Minutes
const CACHE_TTL = 60;

const getKey = (from: CurrencyCode, to: CurrencyCode[]): string =>
	`${from}->${[...to].sort().join(",")}`;

export const procedure = authProcedure
	.input(
		z.strictObject({
			from: currencyCodeSchema,
			to: currencyCodeSchema.array().min(1),
		}),
	)
	.query(async ({ ctx, input }) => {
		if (input.to.includes(input.from)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: 'Currency code "from" and "to" must be different',
			});
		}
		const cacheKey = getKey(input.from, input.to);
		const cacheDatabase = getCacheDatabase(ctx);
		const cachedRates = await cacheDatabase.get<Record<CurrencyCode, number>>(
			cacheKey,
		);
		if (cachedRates) {
			return cachedRates;
		}
		const fetchedRates = await getExchangeRate(ctx, input.from, input.to);
		const missingCodes = input.to.filter(
			(currencyCode) => fetchedRates[currencyCode] === undefined,
		);
		if (missingCodes.length !== 0) {
			const notAvailablePostfix = `not available on remote server. Please contact app owner.`;
			if (missingCodes.length === input.to.length) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Code "${input.from}" is ${notAvailablePostfix}`,
				});
			}
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `${missingCodes.length === 1 ? "Code" : "Codes"} ${missingCodes
					.map((code) => `"${code}"`)
					.join(", ")} ${
					missingCodes.length === 1 ? "is" : "are"
				} ${notAvailablePostfix}`,
			});
		}
		cacheDatabase.setex(cacheKey, CACHE_TTL, fetchedRates).catch((e) => {
			// Failing on this action doesn't matter much
			ctx.logger.warn("Cache DB setex action failed", e);
		});
		return fetchedRates;
	});
