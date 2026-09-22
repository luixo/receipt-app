import type { AccountId, PeerId } from "~db/ids";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get all account connection intentions",
		description:
			"Returns all inbound and outbound account connection intentions for the current account.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;
		const relatedIntentions = await database
			.selectFrom("peers")
			.innerJoin("accounts as sourceAccounts", (qb) =>
				qb.onRef("peers.ownerAccountId", "=", "sourceAccounts.id"),
			)
			.innerJoin("accounts as targetAccounts", (qb) =>
				qb.onRef("peers.connectedAccountId", "=", "targetAccounts.id"),
			)
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef(
						"reciprocalPeers.ownerAccountId",
						"=",
						"peers.connectedAccountId",
					)
					.onRef(
						"reciprocalPeers.connectedAccountId",
						"=",
						"peers.ownerAccountId",
					),
			)
			.where("reciprocalPeers.id", "is", null)
			.where((eb) =>
				eb.or([
					eb("peers.ownerAccountId", "=", ctx.auth.accountId),
					eb("peers.connectedAccountId", "=", ctx.auth.accountId),
				]),
			)
			.select([
				"peers.ownerAccountId as accountId",
				"targetAccounts.id as targetAccountId",
				"peers.id as peerId",
				"peers.name",
				"sourceAccounts.email as sourceAccountEmail",
				"targetAccounts.email as targetAccountEmail",
			])
			.orderBy("peers.updatedAt", "desc")
			.orderBy("peers.id")
			.execute();
		return relatedIntentions.reduce<{
			inbound: {
				account: { id: AccountId; email: string };
			}[];
			outbound: {
				account: { id: AccountId; email: string };
				peer: { id: PeerId; name: string };
			}[];
		}>(
			(acc, intention) => {
				if (intention.accountId === ctx.auth.accountId) {
					acc.outbound.push({
						account: {
							id: intention.targetAccountId,
							email: intention.targetAccountEmail,
						},
						peer: {
							id: intention.peerId,
							name: intention.name,
						},
					});
				} else {
					acc.inbound.push({
						account: {
							id: intention.accountId,
							email: intention.sourceAccountEmail,
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
