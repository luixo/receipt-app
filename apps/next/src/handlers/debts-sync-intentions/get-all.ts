import * as trpc from "@trpc/server";
import { QueryCreator, sql } from "kysely";

import { Currency } from "app/utils/currency";
import { getDatabase, ReceiptsDatabase } from "next-app/db";
import { AccountsId, DebtsId, UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

type CommonIntention = {
	id: DebtsId;
	userId: UsersId;
	currency: Currency;
	amount: number;
	timestamp: Date;
	intentionTimestamp: Date;
	note: string;
};

type InboundIntention = CommonIntention & {
	current?: {
		amount: number;
		timestamp: Date;
	};
};

type OutboundIntention = CommonIntention;

const getInboundIntentions = (
	qc: QueryCreator<ReceiptsDatabase>,
	accountId: AccountsId
) =>
	qc
		.selectFrom("debtsSyncIntentions")
		.where("debtsSyncIntentions.ownerAccountId", "<>", accountId)
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
		.where("users.ownerAccountId", "=", accountId)
		.select([
			"debts.id",
			"debts.ownerAccountId",
			"debts.timestamp",
			"debtsSyncIntentions.lockedTimestamp as intentionTimestamp",
			"debts.amount",
			"debts.currency",
			"users.id as userId",
			"debts.note",
			"selfDebts.amount as selfAmount",
			"selfDebts.timestamp as selfTimestamp",
		]);

const getOutboundIntentions = (
	qc: QueryCreator<ReceiptsDatabase>,
	accountId: AccountsId
) =>
	qc
		.selectFrom("debtsSyncIntentions")
		.where("debtsSyncIntentions.ownerAccountId", "=", accountId)
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
			"debtsSyncIntentions.lockedTimestamp as intentionTimestamp",
			"debts.amount",
			"debts.currency",
			"debts.userId",
			"debts.note",
			sql`null`.castTo<string | null>().as("selfAmount"),
			sql`null`.castTo<Date | null>().as("selfTimestamp"),
		]);

export const router = trpc.router<AuthorizedContext>().query("get-all", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const intentions = await database
			.with("mergedIntentions", (qc) =>
				getInboundIntentions(qc, ctx.auth.accountId).union(
					getOutboundIntentions(qc, ctx.auth.accountId)
				)
			)
			.selectFrom("mergedIntentions")
			.selectAll()
			.orderBy("intentionTimestamp", "desc")
			.orderBy("id", "desc")
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
					intentionTimestamp: intention.intentionTimestamp,
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
