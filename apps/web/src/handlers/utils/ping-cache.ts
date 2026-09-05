import { unauthProcedure } from "~web/handlers/trpc";
import { getCacheInstance } from "~web/providers/cache-db";

export const procedure = unauthProcedure
	.meta({
		title: "Ping cache",
		description: "Test endpoint that warms up the cache database connection.",
	})
	.mutation(async ({ ctx }) => {
		await getCacheInstance(ctx);
	});
