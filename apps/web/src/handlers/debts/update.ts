import { TRPCError } from "@trpc/server";
import { isNonNullish, keys, omitBy } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { SimpleUpdateObject } from "~db/types";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	currencyCodeSchema,
	debtIdSchema,
	receiptIdSchema,
} from "~web/handlers/validation";

import { upsertAutoAcceptedDebts } from "./utils";

const updateDebtSchema = z.strictObject({
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
			(obj) => keys(obj).length !== 0,
			"Update object has to have at least one key to update",
		),
});

type DebtUpdateObject = SimpleUpdateObject<"debts">;

const KEYS_NOT_UPDATE_LOCKED_TIMESTAMP: (keyof DebtUpdateObject)[] = [
	"note",
	"receiptId",
];

const buildSetObjects = (
	input: z.infer<typeof updateDebtSchema>,
	debt: { lockedTimestamp: Date | null },
) => {
	const setObject: DebtUpdateObject = omitBy(
		{
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
		},
		(value) => value === undefined,
	);
	const keysToUpdateLockedTimestamp = keys(input.update).filter(
		(key) =>
			!KEYS_NOT_UPDATE_LOCKED_TIMESTAMP.includes(key as keyof DebtUpdateObject),
	);
	if (keysToUpdateLockedTimestamp.length === 0) {
		// don't update lockedTimestamp if we updated keys that don't require lockedTimestamp update
		delete setObject.lockedTimestamp;
	}
	const reverseSetObject = omitBy(
		{
			...setObject,
			note: undefined,
			amount:
				input.update.amount === undefined
					? undefined
					: (-input.update.amount).toString(),
		},
		(value) => value === undefined,
	);
	return {
		setObject,
		reverseSetObject:
			keys(reverseSetObject).length === 0 ? undefined : reverseSetObject,
	};
};

const fetchDebts = async (
	ctx: AuthorizedContext,
	updates: readonly z.infer<typeof updateDebtSchema>[],
) =>
	ctx.database
		.selectFrom("debts")
		.where((eb) =>
			eb(
				"debts.id",
				"in",
				updates.map((update) => update.id),
			).and("debts.ownerAccountId", "=", ctx.auth.accountId),
		)
		.innerJoin("users", (qb) =>
			qb
				.onRef("users.id", "=", "debts.userId")
				.onRef("users.ownerAccountId", "=", "debts.ownerAccountId"),
		)
		.leftJoin("accountSettings", (qb) =>
			qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
		)
		.leftJoin("users as usersTheir", (qb) =>
			qb
				.onRef("usersTheir.connectedAccountId", "=", "debts.ownerAccountId")
				.onRef("usersTheir.ownerAccountId", "=", "users.connectedAccountId"),
		)
		.select([
			"debts.id",
			"debts.userId",
			"debts.lockedTimestamp",
			"debts.note",
			"debts.currencyCode",
			"debts.amount",
			"debts.timestamp",
			"debts.receiptId",
			"users.connectedAccountId as foreignAccountId",
			"accountSettings.manualAcceptDebts",
			"usersTheir.id as theirUserId",
		])
		.execute();

const isError = <T>(input: T | TRPCError): input is TRPCError =>
	input instanceof TRPCError;

type Debt = Awaited<ReturnType<typeof fetchDebts>>[number];

const getUpdatedDebtsWithErrors = (
	updatesWithErrors: (
		| {
				update: z.infer<typeof updateDebtSchema>;
				debt: Debt;
		  }
		| TRPCError
	)[],
) =>
	updatesWithErrors.map((updateOrError) => {
		if (isError(updateOrError)) {
			return updateOrError;
		}
		const { debt, update } = updateOrError;
		return { ...buildSetObjects(update, debt), debt };
	});

const updateAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	updatedDebtsWithErrors: ReturnType<typeof getUpdatedDebtsWithErrors>,
) => {
	const autoAcceptedData = updatedDebtsWithErrors
		.map((updatedDebtOrError) => {
			if (isError(updatedDebtOrError)) {
				return null;
			}
			const { debt, setObject, reverseSetObject } = updatedDebtOrError;
			if (
				!debt.manualAcceptDebts &&
				debt.foreignAccountId &&
				debt.theirUserId
			) {
				return {
					id: debt.id,
					ownerAccountId: debt.foreignAccountId,
					userId: debt.theirUserId,
					currencyCode: debt.currencyCode,
					amount: (-Number(debt.amount)).toString(),
					timestamp: debt.timestamp,
					lockedTimestamp: debt.lockedTimestamp,
					receiptId: debt.receiptId,
					created: new Date(),
					...reverseSetObject,
					// In case debt doesn't exist - we need to set a new note, not the old one
					note: setObject.note || debt.note,
					isNew: false,
				};
			}
			return null;
		})
		.filter(isNonNullish);
	if (autoAcceptedData.length === 0) {
		return [];
	}
	const { newDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		autoAcceptedData,
	);
	return updatedDebtsWithErrors
		.map((updatedDebtOrError) => {
			if (
				isError(updatedDebtOrError) ||
				(updatedDebtOrError.reverseSetObject?.lockedTimestamp === undefined &&
					!newDebts.some((debt) => updatedDebtOrError.debt.id === debt.id))
			) {
				return;
			}
			return updatedDebtOrError.debt.id;
		})
		.filter(isNonNullish);
};

const updateDebts = async (
	ctx: AuthorizedContext,
	updatedDebtsWithErrors: ReturnType<typeof getUpdatedDebtsWithErrors>,
) =>
	ctx.database.transaction().execute((tx) =>
		Promise.all(
			updatedDebtsWithErrors.map((updatedDebtOrError) => {
				if (isError(updatedDebtOrError)) {
					return null;
				}
				return tx
					.updateTable("debts")
					.set(updatedDebtOrError.setObject)
					.where((eb) =>
						eb.and({
							id: updatedDebtOrError.debt.id,
							ownerAccountId: ctx.auth.accountId,
						}),
					)
					.executeTakeFirst();
			}),
		),
	);

const queueUpdateDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof updateDebtSchema>,
	{
		// value or null for set object, undefined for not being set
		lockedTimestamp: Date | null | undefined;
		reverseLockedTimestampUpdated: boolean;
	}
>((ctx) => async (updates) => {
	const debts = await fetchDebts(ctx, updates);
	const updatesWithErrors = updates.map((update) => {
		const matchedDebt = debts.find((debt) => debt.id === update.id);
		if (!matchedDebt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${update.id}" does not exist on account "${ctx.auth.email}".`,
			});
		}
		return { update, debt: matchedDebt };
	});
	const errors = updatesWithErrors.filter(isError);
	if (updatesWithErrors.length === errors.length) {
		return errors;
	}
	const updatedDebtsWithErrors = getUpdatedDebtsWithErrors(updatesWithErrors);
	const updatedDebtIds = await updateAutoAcceptingDebts(
		ctx,
		updatedDebtsWithErrors,
	);
	await updateDebts(ctx, updatedDebtsWithErrors);
	return updatedDebtsWithErrors.map((updatedDebtOrError) => {
		if (isError(updatedDebtOrError)) {
			return updatedDebtOrError;
		}
		return {
			lockedTimestamp: updatedDebtOrError.setObject.lockedTimestamp,
			reverseLockedTimestampUpdated: updatedDebtIds.includes(
				updatedDebtOrError.debt.id,
			),
		};
	});
});

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(queueUpdateDebt);
