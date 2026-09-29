import { CURRENCY_CODES } from "#utils/currency-data.ts";
import { authProcedure } from "#web/handlers/trpc.ts";

export const procedure = authProcedure
	.meta({
		title: "Get currency list",
		description: "Returns the list of all supported currency codes.",
	})
	.query(() => ({ items: CURRENCY_CODES }));
