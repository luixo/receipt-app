import * as trpc from "@trpc/server";
import { z } from "zod";

import { getCurrencies } from "../../utils/currency";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().query("get-list", {
	input: z.strictObject({
		locale: z.string(),
	}),
	resolve: async ({ input }) =>
		Object.entries(getCurrencies(input.locale)).map(([code, currency]) => ({
			code,
			name: currency.name_plural,
			symbol: currency.symbol_native,
		})),
});
