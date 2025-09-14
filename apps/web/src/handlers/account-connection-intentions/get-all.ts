import type { AccountsId, UsersId } from "~db/models";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const relatedIntentions = await database
		.selectFrom("accountConnectionsIntentions")
		.innerJoin("accounts as sourceAccounts", (qb) =>
			qb.onRef(
				"accountConnectionsIntentions.accountId",
				"=",
				"sourceAccounts.id",
			),
		)
		.innerJoin("accounts as targetAccounts", (qb) =>
			qb.onRef(
				"accountConnectionsIntentions.targetAccountId",
				"=",
				"targetAccounts.id",
			),
		)
		.innerJoin("users", (qb) =>
			qb.onRef("users.id", "=", "accountConnectionsIntentions.userId"),
		)
		.where((eb) =>
			eb.or({
				accountId: ctx.auth.accountId,
				targetAccountId: ctx.auth.accountId,
			}),
		)
		.select([
			"accountConnectionsIntentions.accountId",
			"accountConnectionsIntentions.targetAccountId",
			"users.id as userId",
			"users.name",
			"sourceAccounts.email as sourceAccountEmail",
			"targetAccounts.email as targetAccountEmail",
		])
		.orderBy("accountConnectionsIntentions.createdAt", "desc")
		.orderBy("users.id")
		.execute();
	return relatedIntentions.reduce<{
		inbound: {
			account: { id: AccountsId; email: string };
		}[];
		outbound: {
			account: { id: AccountsId; email: string };
			user: { id: UsersId; name: string };
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
