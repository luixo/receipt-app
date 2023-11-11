import { TRPCError } from "@trpc/server";
import { sql } from "kysely";

import type { CurrencyCode } from "app/utils/currency";
import type { DebtsId, ReceiptsId, UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

type InboundIntention = {
	id: DebtsId;
	userId: UsersId;
	currencyCode: CurrencyCode;
	amount: number;
	timestamp: Date;
	lockedTimestamp: Date;
	note: string;
	receiptId: ReceiptsId | null;
	current?: {
		amount: number;
		currencyCode: CurrencyCode;
		timestamp: Date;
	};
};

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const debts = await database
		.selectFrom("users")
		.where("users.connectedAccountId", "=", ctx.auth.accountId)
		.where("users.ownerAccountId", "<>", ctx.auth.accountId)
		.innerJoin("debts as theirDebts", (qb) =>
			qb.onRef("theirDebts.userId", "=", "users.id"),
		)
		.leftJoin("debts as selfDebts", (qb) =>
			qb
				.onRef("theirDebts.id", "=", "selfDebts.id")
				.onRef("selfDebts.ownerAccountId", "=", "users.connectedAccountId"),
		)
		.innerJoin("users as usersMine", (qb) =>
			qb
				.onRef("usersMine.connectedAccountId", "=", "theirDebts.ownerAccountId")
				.onRef("usersMine.ownerAccountId", "=", "users.connectedAccountId"),
		)
		.where("theirDebts.lockedTimestamp", "is not", null)
		.where((eb) =>
			eb.or([
				eb("selfDebts.id", "is", null),
				eb(
					"selfDebts.lockedTimestamp",
					"<",
					eb.ref("theirDebts.lockedTimestamp"),
				),
			]),
		)
		.select([
			"theirDebts.id",
			"theirDebts.ownerAccountId",
			"theirDebts.timestamp",
			"theirDebts.lockedTimestamp",
			"theirDebts.amount",
			"theirDebts.currencyCode",
			"theirDebts.receiptId",
			"usersMine.id as userId",
			sql`coalesce("selfDebts".note, "theirDebts".note)`
				.castTo<string>()
				.as("note"),
			"selfDebts.amount as selfAmount",
			"selfDebts.timestamp as selfTimestamp",
			"selfDebts.currencyCode as selfCurrencyCode",
		])
		.orderBy("lockedTimestamp", "desc")
		.orderBy("id", "desc")
		.execute();
	return debts.map<InboundIntention>((debt) => {
		/* c8 ignore start */
		if (!debt.lockedTimestamp) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Locked timestamp does not exist on debt id "${debt.id}" though it was filtered to exist`,
			});
		}
		/* c8 ignore stop */
		return {
			id: debt.id,
			userId: debt.userId,
			amount: -Number(debt.amount),
			currencyCode: debt.currencyCode,
			lockedTimestamp: debt.lockedTimestamp!,
			timestamp: debt.timestamp,
			note: debt.note,
			receiptId: debt.receiptId,
			current:
				debt.selfAmount !== null
					? {
							amount: Number(debt.selfAmount),
							timestamp: debt.selfTimestamp!,
							currencyCode: debt.selfCurrencyCode!,
					  }
					: undefined,
		};
	});
});
