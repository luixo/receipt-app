import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "../../db";
import { UnauthorizedContext } from "../context";

export const router = trpc.router<UnauthorizedContext>().mutation("cleanup", {
	input: z.undefined(),
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const result = await database
			.deleteFrom("sessions")
			.where("expirationTimestamp", "<", sql`now()`)
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
