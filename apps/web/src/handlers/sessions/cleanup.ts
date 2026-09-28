// Better Auth stores timestamps as native Date values.
// oxlint-disable eslint-js/no-restricted-syntax
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Clean up sessions",
		description: "Deletes all expired sessions.",
	})
	.mutation(async ({ ctx }) => {
		const { authDatabase } = ctx;
		const result = await authDatabase
			.deleteFrom("auth.session")
			.where("expiresAt", "<", new Date())
			.executeTakeFirstOrThrow();
		return { count: Number(result.numDeletedRows) };
	});
