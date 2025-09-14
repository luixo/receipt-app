import type { CurrencyCode } from "~app/utils/currency";
import type { Debts, DebtsId, ReceiptsId, UsersId } from "~db/models";
import type { Temporal } from "~utils/date";
import type { MappedNullableObject } from "~utils/types";
import { authProcedure } from "~web/handlers/trpc";

type InboundIntention = {
	id: DebtsId;
	userId: UsersId;
	currencyCode: CurrencyCode;
	amount: number;
	timestamp: Temporal.PlainDate;
	updatedAt: Temporal.ZonedDateTime;
	note: string;
	receiptId?: ReceiptsId;
	current?: {
		amount: number;
		currencyCode: CurrencyCode;
		timestamp: Temporal.PlainDate;
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
		.where((eb) =>
			eb.or([
				eb("selfDebts.id", "is", null),
				eb
					.or([
						eb("selfDebts.amount", "<>", eb.neg(eb.ref("theirDebts.amount"))),
						eb(
							"selfDebts.currencyCode",
							"<>",
							eb.ref("theirDebts.currencyCode"),
						),
						eb("selfDebts.timestamp", "<>", eb.ref("theirDebts.timestamp")),
					])
					.and(eb("selfDebts.updatedAt", "<", eb.ref("theirDebts.updatedAt"))),
			]),
		)
		.select([
			"theirDebts.id",
			"theirDebts.ownerAccountId",
			"theirDebts.timestamp",
			"theirDebts.updatedAt",
			"theirDebts.amount",
			"theirDebts.currencyCode",
			"theirDebts.receiptId",
			"usersMine.id as userId",
			(eb) => eb.fn.coalesce("selfDebts.note", "theirDebts.note").as("note"),
			"selfDebts.amount as selfAmount",
			"selfDebts.timestamp as selfTimestamp",
			"selfDebts.currencyCode as selfCurrencyCode",
		])
		.orderBy("theirDebts.updatedAt", "desc")
		.orderBy("theirDebts.id", "desc")
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
		updatedAt: debt.updatedAt,
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
