import { CURRENCY_CODES } from "~utils/currency-data";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get currency list",
		description: "Returns the list of all supported currency codes.",
	})
	.query(() => CURRENCY_CODES);
