import { TRPCError } from "@trpc/server";
import { isNonNullish, keys, omitBy } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { DebtsId } from "~db/models";
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
			receiptId: receiptIdSchema.optional(),
		})
		.partial()
		.refine(
			(obj) => keys(obj).length !== 0,
			"Update object has to have at least one key to update",
		),
});

type DebtUpdateObject = SimpleUpdateObject<"debts">;

const buildSetObjects = (input: z.infer<typeof updateDebtSchema>) => {
	const setObject: DebtUpdateObject = omitBy(
		{
			amount: input.update.amount?.toString(),
			timestamp: input.update.timestamp,
			note: input.update.note,
			currencyCode: input.update.currencyCode,
			receiptId: input.update.receiptId,
		},
		(value) => value === undefined,
	);
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
			"debts.updatedAt",
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
type UpdateWithDebt = ReturnType<typeof buildSetObjects> & {
	debt: Debt;
};

const updateAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	updatedDebtsWithErrors: (UpdateWithDebt | TRPCError)[],
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
					receiptId: debt.receiptId,
					createdAt: new Date(),
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
			if (isError(updatedDebtOrError)) {
				return;
			}
			const newDebtAdded = newDebts.some(
				(debt) => updatedDebtOrError.debt.id === debt.id,
			);
			if (updatedDebtOrError.reverseSetObject || newDebtAdded) {
				return updatedDebtOrError.debt.id;
			}
			return undefined;
		})
		.filter(isNonNullish);
};

const updateDebts = async (
	ctx: AuthorizedContext,
	updatedDebtsWithErrors: (UpdateWithDebt | TRPCError)[],
	updatedDebtIds: DebtsId[],
) =>
	ctx.database.transaction().execute((tx) =>
		Promise.all(
			updatedDebtsWithErrors.map(async (updatedDebtOrError) => {
				if (isError(updatedDebtOrError)) {
					return updatedDebtOrError;
				}
				const { id, updatedAt } = await tx
					.updateTable("debts")
					.set(updatedDebtOrError.setObject)
					.where((eb) =>
						eb.and({
							id: updatedDebtOrError.debt.id,
							ownerAccountId: ctx.auth.accountId,
						}),
					)
					.returning(["debts.id", "debts.updatedAt"])
					.executeTakeFirstOrThrow();
				return {
					updatedAt,
					reverseUpdated: updatedDebtIds.includes(id),
				};
			}),
		),
	);

const queueUpdateDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof updateDebtSchema>,
	{
		updatedAt: Date;
		reverseUpdated: boolean;
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
		return { ...buildSetObjects(update), debt: matchedDebt };
	});
	const errors = updatesWithErrors.filter(isError);
	if (updatesWithErrors.length === errors.length) {
		return errors;
	}
	const updatedDebtIds = await updateAutoAcceptingDebts(ctx, updatesWithErrors);
	return updateDebts(ctx, updatesWithErrors, updatedDebtIds);
});

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(queueUpdateDebt);
