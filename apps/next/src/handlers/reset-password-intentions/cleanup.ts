import * as trpc from "@trpc/server";
import { sql } from "kysely";

import { getDatabase } from "next-app/db";
import { UnauthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<UnauthorizedContext>().mutation("cleanup", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const result = await database
			.deleteFrom("resetPasswordIntentions")
			.where("expiresTimestamp", "<", sql`now()`)
			.executeTakeFirst();
		if (!result) {
			throw new trpc.TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Delete result did not return`,
			});
		}
		return Number(result.numDeletedRows);
	},
});
