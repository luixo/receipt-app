import type { CurrencyCode } from "~app/utils/currency";
import type { Debts, DebtsId, ReceiptsId, UsersId } from "~db/models";
import type { MappedNullableObject } from "~utils/types";
import { authProcedure } from "~web/handlers/trpc";

type InboundIntention = {
	id: DebtsId;
	userId: UsersId;
	currencyCode: CurrencyCode;
	amount: number;
	timestamp: Date;
	lockedTimestamp: Date;
	note: string;
	receiptId?: ReceiptsId;
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
		.where((eb) =>
			eb("users.connectedAccountId", "=", ctx.auth.accountId).and(
				"users.ownerAccountId",
				"<>",
				ctx.auth.accountId,
			),
		)
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
		.where("theirDebts.id", "is not", null)
		.where((eb) =>
			eb("selfDebts.id", "is", null).or(
				"selfDebts.lockedTimestamp",
				"<",
				eb.ref("theirDebts.lockedTimestamp"),
			),
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
			(eb) => eb.fn.coalesce("selfDebts.note", "theirDebts.note").as("note"),
			"selfDebts.amount as selfAmount",
			"selfDebts.timestamp as selfTimestamp",
			"selfDebts.currencyCode as selfCurrencyCode",
		])
		.orderBy(["theirDebts.lockedTimestamp desc", "theirDebts.id desc"])
		.$narrowType<
			MappedNullableObject<
				Debts,
				{
					selfAmount: "amount";
					selfTimestamp: "timestamp";
					selfCurrencyCode: "currencyCode";
				}
			>
		>()
		.execute();
	return debts.map<InboundIntention>((debt) => ({
		id: debt.id,
		userId: debt.userId,
		amount: -Number(debt.amount),
		currencyCode: debt.currencyCode,
		lockedTimestamp: debt.lockedTimestamp,
		timestamp: debt.timestamp,
		note: debt.note,
		receiptId: debt.receiptId || undefined,
		current: debt.selfAmount
			? {
					amount: Number(debt.selfAmount),
					timestamp: debt.selfTimestamp,
					currencyCode: debt.selfCurrencyCode,
			  }
			: undefined,
	}));
});
