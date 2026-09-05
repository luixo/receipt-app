import { getNow } from "~utils/date";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Clean up reset password intentions",
		description: "Deletes all expired reset password intentions.",
	})
	.mutation(async ({ ctx }) => {
		const { database } = ctx;
		const result = await database
			.deleteFrom("resetPasswordIntentions")
			.where("expiresTimestamp", "<", getNow.zonedDateTime())
			.executeTakeFirstOrThrow();
		return Number(result.numDeletedRows);
	});
