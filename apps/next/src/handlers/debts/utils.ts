import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getReceiptDebtName } from "app/utils/receipt";
import { omitUndefined } from "app/utils/utils";
import { debtAmountSchema, debtNoteSchema } from "app/utils/validation";
import type { Database } from "next-app/db";
import { DEBTS } from "next-app/db/consts";
import type { Receipts, ReceiptsId, UsersId } from "next-app/db/models";
import type { SimpleUpdateObject } from "next-app/db/types";
import type { getValidParticipants } from "next-app/handlers/receipt-items/utils";
import {
	currencyCodeSchema,
	debtIdSchema,
	receiptIdSchema,
} from "next-app/handlers/validation";

type Participant = Awaited<ReturnType<typeof getValidParticipants>>[number];

export const upsertDebtFromReceipt = async (
	database: Database,
	participants: Participant[],
	receipt: Pick<
		Receipts,
		| "id"
		| "ownerAccountId"
		| "lockedTimestamp"
		| "name"
		| "issued"
		| "currencyCode"
	>,
	created: Date,
) =>
	database
		.insertInto("debts")
		.values(
			participants.map((participant) => ({
				id: participant.debtId,
				ownerAccountId: receipt.ownerAccountId,
				userId: participant.remoteUserId,
				note: getReceiptDebtName(receipt.name),
				currencyCode: receipt.currencyCode,
				created,
				timestamp: receipt.issued,
				amount: participant.sum.toString(),
				receiptId: receipt.id,
				lockedTimestamp: receipt.lockedTimestamp,
			})),
		)
		.onConflict((oc) =>
			oc
				.constraint(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)
				.doUpdateSet({
					currencyCode: (eb) => eb.ref("excluded.currencyCode"),
					timestamp: (eb) => eb.ref("excluded.timestamp"),
					amount: (eb) => eb.ref("excluded.amount"),
					lockedTimestamp: (eb) => eb.ref("excluded.lockedTimestamp"),
				}),
		)
		.returning(["id as debtId", "userId", "note"])
		.execute();

export const getDebtsResult = (
	participants: Participant[],
	actualDebts: Awaited<ReturnType<typeof upsertDebtFromReceipt>>,
	receipt: Pick<
		Receipts,
		| "id"
		| "ownerAccountId"
		| "lockedTimestamp"
		| "name"
		| "issued"
		| "currencyCode"
	>,
	created: Date,
) =>
	participants.map((participant) => {
		const actualDebt = actualDebts.find(
			(debt) => debt.userId === participant.remoteUserId,
		)!;
		return {
			debtId: actualDebt.debtId,
			userId: participant.remoteUserId,
			updated: actualDebt.debtId !== participant.debtId,
			note: actualDebt.note,
			currencyCode: receipt.currencyCode,
			created,
			timestamp: receipt.issued,
			amount: Number(participant.sum),
		};
	});

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
		}
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
		amount: setObject.amount ? `-${setObject.amount}` : undefined,
	});
	return {
		setObject,
		reverseSetObject:
			Object.keys(reverseSetObject).length === 0 ? undefined : reverseSetObject,
	};
};
