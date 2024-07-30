import { adminProcedure } from "~web/handlers/trpc";

export const procedure = adminProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const result = await database
		.selectFrom("accounts")
		.leftJoin("users", (qb) =>
			qb
				.onRef("accounts.id", "=", "users.connectedAccountId")
				.on("users.ownerAccountId", "=", ctx.auth.accountId),
		)
		.where("accounts.id", "!=", ctx.auth.accountId)
		.orderBy(["users.name", "accounts.email"])
		.select([
			"users.id as userId",
			"users.name",
			"accounts.id as accountId",
			"accounts.avatarUrl",
			"accounts.email",
		])
		.execute();
	return result.map((element) => ({
		account: {
			email: element.email,
			id: element.accountId,
			avatarUrl: element.avatarUrl ?? undefined,
		},
		user:
			element.userId && element.name
				? {
						id: element.userId,
						name: element.name,
				  }
				: undefined,
	}));
});
