import * as trpc from "@trpc/server";
import { z } from "zod";

import type { CurrencyCode } from "app/utils/currency";
import { authProcedure } from "next-app/handlers/trpc";
import { localeSchema } from "next-app/handlers/validation";
import { getCurrencies } from "next-app/utils/currency";

export const procedure = authProcedure
	.input(
		z.strictObject({
			locale: localeSchema,
		}),
	)
	.query(async ({ input }) => {
		const currencies = getCurrencies(input.locale);
		if (!currencies) {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Locale ${input.locale} is invalid.`,
			});
		}
		return Object.entries(currencies).map(([code, currency]) => ({
			code: code as CurrencyCode,
			name: currency.name_plural,
			symbol: currency.symbol_native,
		}));
	});
