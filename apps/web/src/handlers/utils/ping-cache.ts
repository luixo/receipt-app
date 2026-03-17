import { unauthProcedure } from "~web/handlers/trpc";
import { getCacheInstance } from "~web/providers/cache-db";

export const procedure = unauthProcedure.mutation(async ({ ctx }) => {
	await getCacheInstance(ctx);
});
