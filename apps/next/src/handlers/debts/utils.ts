import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { nonNullishGuard, omitUndefined } from "app/utils/utils";
import { debtAmountSchema, debtNoteSchema } from "app/utils/validation";
import type { Database } from "next-app/db";
import { DEBTS } from "next-app/db/consts";
import type { DebtsId, ReceiptsId, UsersId } from "next-app/db/models";
import type { SimpleInsertObject, SimpleUpdateObject } from "next-app/db/types";
import {
	currencyCodeSchema,
	debtIdSchema,
	receiptIdSchema,
} from "next-app/handlers/validation";

export const upsertAutoAcceptedDebts = async (
	database: Database,
	debts: (SimpleInsertObject<"debts"> & { isNew: boolean })[],
) => {
	const fetchedDebts = await database
		.selectFrom("debts")
		.where((eb) =>
			eb.or(
				debts.map((debt) =>
					!debt.isNew
						? eb.and({
								id: debt.id,
								ownerAccountId: debt.ownerAccountId,
						  })
						: debt.receiptId
						? eb.and({
								ownerAccountId: debt.ownerAccountId,
								userId: debt.userId,
								receiptId: debt.receiptId,
						  })
						: eb("debts.ownerAccountId", "is", null),
				),
			),
		)

		.select([
			"debts.id",
			"debts.ownerAccountId",
			"debts.userId",
			"debts.receiptId",
		])
		.execute();
	const counterpartyDebts = debts.map((debt) =>
		fetchedDebts.find((fetchedDebt) => {
			if (debt.isNew) {
				if (!debt.receiptId || !fetchedDebt.receiptId) {
					return false;
				}
				return (
					fetchedDebt.ownerAccountId === debt.ownerAccountId &&
					fetchedDebt.userId === debt.userId &&
					fetchedDebt.receiptId === debt.receiptId
				);
			}
			return (
				fetchedDebt.ownerAccountId === debt.ownerAccountId &&
				fetchedDebt.id === debt.id
			);
		}),
	);
	const existentDebts = debts
		.map((nextDebt, index) =>
			counterpartyDebts[index]
				? ([nextDebt, counterpartyDebts[index]!] as const)
				: null,
		)
		.filter(nonNullishGuard);
	const nonExistentDebts = debts
		.map((nextDebt, index) => (counterpartyDebts[index] ? null : nextDebt))
		.filter(nonNullishGuard);
	const [newDebts, ...updatedDebts] = await Promise.all([
		nonExistentDebts.length === 0
			? ([] as { id: DebtsId }[])
			: database
					.insertInto("debts")
					.values(nonExistentDebts.map(({ isNew, ...debt }) => debt))
					.returning(["debts.id"])
					.execute(),
		...existentDebts.map(([nextDebt, currentDebt]) =>
			database
				.updateTable("debts")
				.set({
					amount: nextDebt.amount,
					timestamp: nextDebt.timestamp,
					currencyCode: nextDebt.currencyCode,
					receiptId: nextDebt.receiptId,
					lockedTimestamp: nextDebt.lockedTimestamp,
				})
				.where((eb) =>
					eb.and({
						id: currentDebt.id,
						ownerAccountId: currentDebt.ownerAccountId,
						userId: currentDebt.userId,
					}),
				)
				.returning(["debts.id", "debts.receiptId"])
				.executeTakeFirst(),
		),
	]);
	return { newDebts, updatedDebts };
};

export const withOwnerReceiptUserConstraint = async <T>(
	fn: () => Promise<T>,
	extractData: (e: unknown) => { receiptId: ReceiptsId; userId: UsersId },
) => {
	try {
		const result = await fn();
		return result;
	} catch (e) {
		// Could be like `duplicate key value violates unique constraint "..."`
		const message = String(e);
		if (message.includes(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)) {
			const { receiptId, userId } = extractData(e);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `There is already a debt for user "${userId}" in receipt "${receiptId}".`,
			});
			// This is probably a bug in c8
			/* c8 ignore next */
		}
		/* c8 ignore next 2 */
		throw e;
	}
};

type DebtUpdateObject = SimpleUpdateObject<"debts">;

const KEYS_NOT_UPDATE_LOCKED_TIMESTAMP: (keyof DebtUpdateObject)[] = [
	"note",
	"receiptId",
];

export const updateDebtSchema = z.strictObject({
	id: debtIdSchema,
	update: z
		.strictObject({
			amount: debtAmountSchema,
			timestamp: z.date(),
			note: debtNoteSchema,
			currencyCode: currencyCodeSchema,
			locked: z.boolean(),
			receiptId: receiptIdSchema.optional(),
		})
		.partial()
		.refine(
			(obj) => Object.keys(obj).length !== 0,
			"Update object has to have at least one key to update",
		),
});

export const buildSetObjects = (
	input: z.infer<typeof updateDebtSchema>,
	debt: { lockedTimestamp: Date | null },
) => {
	const setObject: DebtUpdateObject = omitUndefined<DebtUpdateObject>({
		amount: input.update.amount?.toString(),
		timestamp: input.update.timestamp,
		note: input.update.note,
		currencyCode: input.update.currencyCode,
		receiptId: input.update.receiptId,
		lockedTimestamp:
			input.update.locked === undefined
				? debt.lockedTimestamp === null
					? undefined
					: new Date()
				: input.update.locked
				? new Date()
				: null,
	});
	const keysToUpdateLockedTimestamp = Object.keys(input.update).filter(
		(key) =>
			!KEYS_NOT_UPDATE_LOCKED_TIMESTAMP.includes(key as keyof DebtUpdateObject),
	);
	if (keysToUpdateLockedTimestamp.length === 0) {
		// don't update lockedTimestamp if we updated keys that don't require lockedTimestamp update
		delete setObject.lockedTimestamp;
	}
	const reverseSetObject = omitUndefined({
		...setObject,
		note: undefined,
		amount:
			input.update.amount === undefined
				? undefined
				: (-input.update.amount).toString(),
	});
	return {
		setObject,
		reverseSetObject:
			Object.keys(reverseSetObject).length === 0 ? undefined : reverseSetObject,
	};
};
