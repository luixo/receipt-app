import { QueryCreator, sql } from "kysely";

import { Currency } from "app/utils/currency";
import { getDatabase } from "next-app/db";
import { AccountsId, DebtsId, UsersId } from "next-app/db/models";
import { ReceiptsDatabase } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";

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
		.selectFrom("users")
		.where("users.connectedAccountId", "=", accountId)
		.where("users.ownerAccountId", "<>", accountId)
		.innerJoin("debts", (qb) => qb.onRef("debts.userId", "=", "users.id"))
		.innerJoin("debtsSyncIntentions", (qb) =>
			qb
				.onRef("debtsSyncIntentions.debtId", "=", "debts.id")
				.onRef(
					"debtsSyncIntentions.ownerAccountId",
					"<>",
					"users.connectedAccountId"
				)
		)
		.leftJoin("debts as selfDebts", (qb) =>
			qb
				.onRef("debts.id", "=", "selfDebts.id")
				.onRef("selfDebts.ownerAccountId", "=", "users.connectedAccountId")
		)
		.innerJoin("users as usersMine", (qb) =>
			qb
				.onRef(
					"usersMine.connectedAccountId",
					"=",
					"debtsSyncIntentions.ownerAccountId"
				)
				.onRef("usersMine.ownerAccountId", "=", "users.connectedAccountId")
		)
		.select([
			"debts.id",
			"debts.ownerAccountId",
			"debts.timestamp",
			"debtsSyncIntentions.lockedTimestamp as intentionTimestamp",
			"debts.amount",
			"debts.currency",
			"usersMine.id as userId",
			sql`coalesce("selfDebts".note, "debts".note)`.castTo<string>().as("note"),
			"selfDebts.amount as selfAmount",
			"selfDebts.timestamp as selfTimestamp",
		]);

const getOutboundIntentions = (
	qc: QueryCreator<ReceiptsDatabase>,
	accountId: AccountsId
) =>
	qc
		.selectFrom("debtsSyncIntentions")
		.innerJoin("debts", (qb) =>
			qb.onRef("debts.id", "=", "debtsSyncIntentions.debtId")
		)
		.where("debtsSyncIntentions.ownerAccountId", "=", accountId)
		.where("debts.ownerAccountId", "=", accountId)
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

export const procedure = authProcedure.query(async ({ ctx }) => {
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
});
