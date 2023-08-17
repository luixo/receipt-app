import * as trpc from "@trpc/server";
import { sql } from "kysely";

import { unauthProcedure } from "next-app/handlers/trpc";

export const procedure = unauthProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
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
});
