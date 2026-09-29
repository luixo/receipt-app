import { unauthProcedure } from "#web/handlers/trpc.ts";

export const procedure = unauthProcedure
	.meta({
		title: "Clean up sessions",
		description: "Deletes all expired sessions.",
	})
	.mutation(async ({ ctx }) => {
		const { database } = ctx;
		const result = await database
			.deleteFrom("sessions")
			.where("expirationTimestamp", "<", Temporal.Now.zonedDateTimeISO())
			.executeTakeFirstOrThrow();
		return { count: Number(result.numDeletedRows) };
	});
