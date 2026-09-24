import { adminProcedure } from "~web/handlers/trpc";

export const procedure = adminProcedure
	.meta({
		title: "Get all users",
		description:
			"Returns all users other than the caller's, with the caller's matching peer for each (admin only).",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const result = await database
			.selectFrom("users")
			.leftJoin("peers", (qb) =>
				qb
					.onRef("users.id", "=", "peers.connectedUserId")
					.on("peers.ownerUserId", "=", ctx.auth.userId),
			)
			.where("users.id", "!=", ctx.auth.userId)
			.orderBy("peers.name")
			.orderBy("users.email")
			.select([
				"peers.id as peerId",
				"peers.name",
				"users.id as userId",
				"users.avatarUrl",
				"users.email",
			])
			.execute();
		return {
			items: result.map((element) => ({
				user: {
					email: element.email,
					id: element.userId,
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
