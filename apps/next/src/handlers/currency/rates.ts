import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema } from "next-app/handlers/validation";
import { getExchangeRates } from "next-app/providers/exchange-rate";

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
		return getExchangeRates(ctx, input.from, input.to);
	});
