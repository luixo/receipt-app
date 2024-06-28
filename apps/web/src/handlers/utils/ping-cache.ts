import { unauthProcedure } from "~web/handlers/trpc";
import { getCacheDatabase } from "~web/providers/cache-db";

export const procedure = unauthProcedure.mutation(async ({ ctx }) => {
	await getCacheDatabase(ctx);
});
