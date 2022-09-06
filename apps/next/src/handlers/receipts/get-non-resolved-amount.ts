import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);

	const receiptIds = await database
		.selectFrom("receiptParticipants")
		.innerJoin("users", (qb) =>
			qb
				.on("users.connectedAccountId", "=", ctx.auth.accountId)
				.onRef("users.id", "=", "receiptParticipants.userId")
		)
		.where("receiptParticipants.resolved", "=", false)
		.select("receiptId")
		.execute();
	return receiptIds.length;
});
