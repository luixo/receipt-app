import { CURRENCIES } from "~utils/currency-data";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(() => CURRENCIES);
