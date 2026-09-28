// Better Auth stores timestamps as native Date values.
// oxlint-disable eslint-js/no-restricted-syntax
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Clean up reset password intentions",
		description: "Deletes all expired reset password intentions.",
	})
	.mutation(async ({ ctx }) => {
		const { authDatabase } = ctx;
		const result = await authDatabase
			.deleteFrom("auth.verification")
			.where("identifier", "like", "reset-password:%")
			.where("expiresAt", "<", new Date())
			.executeTakeFirstOrThrow();
		return { count: Number(result.numDeletedRows) };
	});
