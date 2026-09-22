import { adminProcedure } from "~web/handlers/trpc";

export const procedure = adminProcedure
	.meta({
		title: "Get all accounts",
		description:
			"Returns all accounts other than the caller's, with the caller's matching peer for each (admin only).",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const result = await database
			.selectFrom("accounts")
			.leftJoin("peers", (qb) =>
				qb
					.onRef("accounts.id", "=", "peers.connectedAccountId")
					.on("peers.ownerAccountId", "=", ctx.auth.accountId),
			)
			.where("accounts.id", "!=", ctx.auth.accountId)
			.orderBy("peers.name")
			.orderBy("accounts.email")
			.select([
				"peers.id as peerId",
				"peers.name",
				"accounts.id as accountId",
				"accounts.avatarUrl",
				"accounts.email",
			])
			.execute();
		return {
			items: result.map((element) => ({
				account: {
					email: element.email,
					id: element.accountId,
					avatarUrl: element.avatarUrl ?? undefined,
				},
				peer:
					element.peerId && element.name
						? {
								id: element.peerId,
								name: element.name,
							}
						: undefined,
			})),
		};
	});
