import type { PeerId, UserId } from "~db/ids";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get all  user connection intentions",
		description:
			"Returns all inbound and outbound  user connection intentions for the current  user.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const relatedIntentions = await database
			.selectFrom("peers")
			.innerJoin("users as sourceUsers", (qb) =>
				qb.onRef("peers.ownerUserId", "=", "sourceUsers.id"),
			)
			.innerJoin("users as targetUsers", (qb) =>
				qb.onRef("peers.connectedUserId", "=", "targetUsers.id"),
			)
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
					.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
			)
			.where("reciprocalPeers.id", "is", null)
			.where((eb) =>
				eb.or([
					eb("peers.ownerUserId", "=", ctx.auth.userId),
					eb("peers.connectedUserId", "=", ctx.auth.userId),
				]),
			)
			.select([
				"peers.ownerUserId as userId",
				"targetUsers.id as targetUserId",
				"peers.id as peerId",
				"peers.name",
				"sourceUsers.email as sourceUserEmail",
				"targetUsers.email as targetUserEmail",
			])
			.orderBy("peers.updatedAt", "desc")
			.orderBy("peers.id")
			.execute();
		return relatedIntentions.reduce<{
			inbound: {
				user: { id: UserId; email: string };
			}[];
			outbound: {
				user: { id: UserId; email: string };
				peer: { id: PeerId; name: string };
			}[];
		}>(
			(acc, intention) => {
				if (intention.userId === ctx.auth.userId) {
					acc.outbound.push({
						user: {
							id: intention.targetUserId,
							email: intention.targetUserEmail,
						},
						peer: {
							id: intention.peerId,
							name: intention.name,
						},
					});
				} else {
					acc.inbound.push({
						user: {
							id: intention.userId,
							email: intention.sourceUserEmail,
						},
					});
				}
				return acc;
			},
			{
				outbound: [],
				inbound: [],
			},
		);
	});
