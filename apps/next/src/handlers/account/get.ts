import { TRPCError } from "@trpc/server";

import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);
	const maybeAccount = await database
		.selectFrom("accounts")
		.innerJoin("users", (jb) =>
			jb.onRef("users.ownerAccountId", "=", "accounts.id")
		)
		.select([
			"accounts.id",
			"users.name",
			"users.publicName",
			"accounts.confirmationToken",
		])
		.where("accounts.id", "=", ctx.auth.accountId)
		.executeTakeFirst();
	if (!maybeAccount) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Account ${ctx.auth.accountId} is not found`,
		});
	}
	const { confirmationToken, ...account } = maybeAccount;
	return {
		...account,
		verified: !confirmationToken,
	};
});
