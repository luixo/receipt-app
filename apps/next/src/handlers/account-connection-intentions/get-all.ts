import * as trpc from "@trpc/server";

import { getDatabase } from "next-app/db";
import { AccountsId, UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().query("getAll", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const relatedIntentions = await database
			.selectFrom("accountConnectionsIntentions")
			.innerJoin("accounts as sourceAccounts", (qb) =>
				qb.onRef("accountId", "=", "sourceAccounts.id")
			)
			.innerJoin("accounts as targetAccounts", (qb) =>
				qb.onRef("targetAccountId", "=", "targetAccounts.id")
			)
			.innerJoin("users", (qb) =>
				qb.onRef("users.id", "=", "accountConnectionsIntentions.userId")
			)
			.where("accountId", "=", ctx.auth.accountId)
			.orWhere("targetAccountId", "=", ctx.auth.accountId)
			.select([
				"accountId",
				"targetAccountId",
				"userId",
				"users.name",
				"sourceAccounts.email as sourceAccountEmail",
				"targetAccounts.email as targetAccountEmail",
			])
			.execute();
		return relatedIntentions.reduce<{
			inbound: { accountId: AccountsId; email: string }[];
			outbound: {
				accountId: AccountsId;
				email: string;
				userId: UsersId;
				userName: string;
			}[];
		}>(
			(acc, intention) => {
				if (intention.accountId === ctx.auth.accountId) {
					acc.outbound.push({
						accountId: intention.targetAccountId,
						userId: intention.userId,
						userName: intention.name,
						email: intention.targetAccountEmail,
					});
				} else {
					acc.inbound.push({
						accountId: intention.accountId,
						email: intention.sourceAccountEmail,
					});
				}
				return acc;
			},
			{
				outbound: [],
				inbound: [],
			}
		);
	},
});
