import type { AccountId, UserId } from "~db/ids";
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
			.selectFrom("users")
			.innerJoin("accounts as sourceAccounts", (qb) =>
				qb.onRef("users.ownerAccountId", "=", "sourceAccounts.id"),
			)
			.innerJoin("accounts as targetAccounts", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "targetAccounts.id"),
			)
			.leftJoin("users as reciprocalUsers", (qb) =>
				qb
					.onRef(
						"reciprocalUsers.ownerAccountId",
						"=",
						"users.connectedAccountId",
					)
					.onRef(
						"reciprocalUsers.connectedAccountId",
						"=",
						"users.ownerAccountId",
					),
			)
			.where("reciprocalUsers.id", "is", null)
			.where((eb) =>
				eb.or([
					eb("users.ownerAccountId", "=", ctx.auth.accountId),
					eb("users.connectedAccountId", "=", ctx.auth.accountId),
				]),
			)
			.select([
				"users.ownerAccountId as accountId",
				"targetAccounts.id as targetAccountId",
				"users.id as userId",
				"users.name",
				"sourceAccounts.email as sourceAccountEmail",
				"targetAccounts.email as targetAccountEmail",
			])
			.orderBy("users.updatedAt", "desc")
			.orderBy("users.id")
			.execute();
		return relatedIntentions.reduce<{
			inbound: {
				account: { id: AccountId; email: string };
			}[];
			outbound: {
				account: { id: AccountId; email: string };
				user: { id: UserId; name: string };
			}[];
		}>(
			(acc, intention) => {
				if (intention.accountId === ctx.auth.accountId) {
					acc.outbound.push({
						account: {
							id: intention.targetAccountId,
							email: intention.targetAccountEmail,
						},
						user: {
							id: intention.userId,
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
