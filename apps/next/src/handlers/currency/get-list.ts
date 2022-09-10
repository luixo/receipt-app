import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { localeSchema } from "next-app/handlers/validation";
import { getCurrencies } from "next-app/utils/currency";

export const procedure = authProcedure
	.input(
		z.strictObject({
			locale: localeSchema,
		})
	)
	.query(async ({ input }) =>
		Object.entries(getCurrencies(input.locale)).map(([code, currency]) => ({
			code,
			name: currency.name_plural,
			symbol: currency.symbol_native,
		}))
	);
