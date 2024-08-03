import { TRPCError } from "@trpc/server";
import { entries } from "remeda";
import { z } from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import { getCurrencies } from "~utils/currency-data";
import { authProcedure } from "~web/handlers/trpc";
import { localeSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			locale: localeSchema,
		}),
	)
	.query(async ({ input }) => {
		const currencies = getCurrencies(input.locale);
		if (!currencies) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Locale "${input.locale}" is invalid.`,
			});
		}
		return entries(currencies).map(([code, currency]) => ({
			code: code as CurrencyCode,
			name: currency.name_plural,
			symbol: currency.symbol_native,
		}));
	});
