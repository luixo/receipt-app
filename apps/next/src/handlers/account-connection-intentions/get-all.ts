import { AccountsId, UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const relatedIntentions = await database
		.selectFrom("accountConnectionsIntentions")
		.innerJoin("accounts as sourceAccounts", (qb) =>
			qb.onRef("accountId", "=", "sourceAccounts.id"),
		)
		.innerJoin("accounts as targetAccounts", (qb) =>
			qb.onRef("targetAccountId", "=", "targetAccounts.id"),
		)
		.innerJoin("users", (qb) =>
			qb.onRef("users.id", "=", "accountConnectionsIntentions.userId"),
		)
		.where((eb) =>
			eb.or([
				eb("accountId", "=", ctx.auth.accountId),
				eb("targetAccountId", "=", ctx.auth.accountId),
			]),
		)
		.select([
			"accountId",
			"targetAccountId",
			"users.id as userId",
			"users.name",
			"sourceAccounts.email as sourceAccountEmail",
			"targetAccounts.email as targetAccountEmail",
		])
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
