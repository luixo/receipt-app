import { unauthProcedure } from "next-app/handlers/trpc";

export const procedure = unauthProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	const result = await database
		.deleteFrom("sessions")
		.where("expirationTimestamp", "<", new Date())
		.executeTakeFirstOrThrow();
	return Number(result.numDeletedRows);
});
