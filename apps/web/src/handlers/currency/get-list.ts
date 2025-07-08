import { CURRENCY_CODES } from "~utils/currency-data";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(() => CURRENCY_CODES);
