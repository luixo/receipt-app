import { getNow } from "~utils/date";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	const result = await database
		.deleteFrom("resetPasswordIntentions")
		.where("expiresTimestamp", "<", getNow())
		.executeTakeFirstOrThrow();
	return Number(result.numDeletedRows);
});
