import * as trpc from "@trpc/server";
import { sql } from "kysely";

import { Currency } from "app/utils/currency";
import { getDatabase } from "next-app/db";
import { DebtsId, UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

type CommonIntention = {
	id: DebtsId;
	userId: UsersId;
	currency: Currency;
	amount: number;
	timestamp: Date;
	lockedTimestamp: Date;
	note: string;
};

type InboundIntention = CommonIntention & {
	current?: {
		amount: number;
		timestamp: Date;
	};
};

type OutboundIntention = CommonIntention;

export const router = trpc.router<AuthorizedContext>().query("get-all", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const intentions = await database
			.with("mergedIntentions", (qc) =>
				qc
					.selectFrom("debtsSyncIntentions")
					.where("debtsSyncIntentions.ownerAccountId", "<>", ctx.auth.accountId)
					.innerJoin("debts", (qb) =>
						qb
							.onRef("debts.id", "=", "debtsSyncIntentions.debtId")
							.onRef(
								"debts.ownerAccountId",
								"=",
								"debtsSyncIntentions.ownerAccountId"
							)
					)
					.innerJoin("accounts", "accounts.id", "debts.ownerAccountId")
					.innerJoin("users", "accounts.id", "users.connectedAccountId")
					.leftJoin("debts as selfDebts", (qb) =>
						qb
							.onRef("selfDebts.id", "=", "debtsSyncIntentions.debtId")
							.onRef(
								"selfDebts.ownerAccountId",
								"<>",
								"debtsSyncIntentions.ownerAccountId"
							)
					)
					.where("users.ownerAccountId", "=", ctx.auth.accountId)
					.select([
						"debts.id",
						"debts.ownerAccountId",
						"debts.timestamp",
						"debtsSyncIntentions.lockedTimestamp",
						"debts.amount",
						"debts.currency",
						"users.id as userId",
						"debts.note",
						"selfDebts.amount as selfAmount",
						"selfDebts.timestamp as selfTimestamp",
					])
					.union(
						qc
							.selectFrom("debtsSyncIntentions")
							.where(
								"debtsSyncIntentions.ownerAccountId",
								"=",
								ctx.auth.accountId
							)
							.innerJoin("debts", (qb) =>
								qb
									.onRef("debts.id", "=", "debtsSyncIntentions.debtId")
									.onRef(
										"debts.ownerAccountId",
										"=",
										"debtsSyncIntentions.ownerAccountId"
									)
							)
							.select([
								"debts.id",
								"debts.ownerAccountId",
								"debts.timestamp",
								"debtsSyncIntentions.lockedTimestamp",
								"debts.amount",
								"debts.currency",
								"debts.userId",
								"debts.note",
								sql`null`.castTo<string | null>().as("selfAmount"),
								sql`null`.castTo<Date | null>().as("selfTimestamp"),
							])
					)
			)
			.selectFrom("mergedIntentions")
			.selectAll()
			.orderBy("lockedTimestamp", "desc")
			.execute();
		return intentions.reduce<{
			inbound: InboundIntention[];
			outbound: OutboundIntention[];
		}>(
			(acc, intention) => {
				const commonIntention: CommonIntention = {
					id: intention.id,
					userId: intention.userId,
					amount: Number(intention.amount),
					currency: intention.currency,
					lockedTimestamp: intention.lockedTimestamp,
					timestamp: intention.timestamp,
					note: intention.note,
				};
				if (intention.ownerAccountId === ctx.auth.accountId) {
					acc.outbound.push({
						...commonIntention,
					});
				} else {
					acc.inbound.push({
						...commonIntention,
						amount: -commonIntention.amount,
						current:
							intention.selfAmount !== null
								? {
										amount: Number(intention.selfAmount),
										timestamp: intention.selfTimestamp!,
								  }
								: undefined,
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
