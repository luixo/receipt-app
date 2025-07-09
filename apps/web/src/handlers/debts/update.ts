import { TRPCError } from "@trpc/server";
import { isNonNullish, keys, omitBy, unique } from "remeda";
import { z } from "zod/v4";

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
			receiptId: receiptIdSchema.optional(),
		})
		.partial()
		.check((ctx) => {
			if (ctx.issues.length !== 0) {
				// Short-circuit on continuable errors
				// It doesn't make sense to nag on object emptiness if some other error happened
				return;
			}
			if (keys(ctx.value).length === 0) {
				ctx.issues.push({
					code: "custom",
					message: "Update object has to have at least one key to update",
					input: ctx.value,
				});
			}
		}),
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
		reverseSetObject,
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

type Debt = Awaited<ReturnType<typeof fetchDebts>>[number];
type UpdateWithDebt = ReturnType<typeof buildSetObjects> & {
	debt: Debt;
};

const mergeSetObjects = (
	setObjectA: DebtUpdateObject,
	setObjectB: DebtUpdateObject,
): DebtUpdateObject => ({ ...setObjectA, ...setObjectB });

const mergeReverseSetObjects = (
	setObjectA: Partial<DebtUpdateObject>,
	setObjectB: Partial<DebtUpdateObject>,
): Partial<DebtUpdateObject> => ({ ...setObjectA, ...setObjectB });

const mergeUpdates = (debtsToUpdate: UpdateWithDebt[]): UpdateWithDebt[] =>
	debtsToUpdate.reduce<UpdateWithDebt[]>((acc, debtToUpdate) => {
		const previousDebt = acc.find(
			({ debt }) => debt.id === debtToUpdate.debt.id,
		);
		if (!previousDebt) {
			return [...acc, debtToUpdate];
		}
		return [
			...acc.filter(({ debt }) => debt.id !== debtToUpdate.debt.id),
			{
				debt: debtToUpdate.debt,
				setObject: mergeSetObjects(
					debtToUpdate.setObject,
					previousDebt.setObject,
				),
				reverseSetObject: mergeReverseSetObjects(
					debtToUpdate.reverseSetObject,
					previousDebt.reverseSetObject,
				),
			},
		];
	}, []);

const updateAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	debtsToUpdate: UpdateWithDebt[],
) => {
	const autoAcceptedData = debtsToUpdate
		.map((debtToUpdate) => {
			const { debt, setObject, reverseSetObject } = debtToUpdate;
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
	return debtsToUpdate
		.map((debtToUpdate) => {
			const newDebtAdded = newDebts.some(
				(debt) => debtToUpdate.debt.id === debt.id,
			);
			if (keys(debtToUpdate.reverseSetObject).length !== 0 || newDebtAdded) {
				return debtToUpdate.debt.id;
			}
			return undefined;
		})
		.filter(isNonNullish);
};

const updateDebts = async (
	ctx: AuthorizedContext,
	debtsToUpdate: UpdateWithDebt[],
) => {
	if (debtsToUpdate.length === 0) {
		return [];
	}
	const results = await ctx.database.transaction().execute((tx) =>
		Promise.all(
			debtsToUpdate.map(async (debtToUpdate) => {
				const { id, updatedAt } = await tx
					.updateTable("debts")
					.set(debtToUpdate.setObject)
					.where((eb) =>
						eb.and({
							id: debtToUpdate.debt.id,
							ownerAccountId: ctx.auth.accountId,
						}),
					)
					.returning(["debts.id", "debts.updatedAt"])
					.executeTakeFirstOrThrow();
				return {
					id,
					updatedAt,
				};
			}),
		),
	);
	return results;
};

const queueUpdateDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof updateDebtSchema>,
	{
		updatedAt: Date;
		// `undefined` signifies that user is local
		reverseUpdated: boolean | undefined;
	}
>((ctx) => async (updates) => {
	const debts = await fetchDebts(ctx, updates);
	const updatesOrErrors = updates.map((update) => {
		const matchedDebt = debts.find((debt) => debt.id === update.id);
		if (!matchedDebt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${update.id}" does not exist on account "${ctx.auth.email}".`,
			});
		}
		return { ...buildSetObjects(update), debt: matchedDebt };
	});
	const debtsToUpdate = updatesOrErrors.filter(
		(
			updateOrError,
		): updateOrError is Exclude<typeof updateOrError, TRPCError> =>
			!(updateOrError instanceof TRPCError),
	);
	const mergedDebts = mergeUpdates(debtsToUpdate);
	const [reverseUpdatedDebtsIds, updatedDebts] = await Promise.all([
		updateAutoAcceptingDebts(ctx, mergedDebts),
		updateDebts(ctx, mergedDebts),
	]);
	const localUserIds = unique(
		debts
			.filter((debt) => debt.foreignAccountId === null)
			.map((debt) => debt.userId),
	);
	return updatesOrErrors.map((updateOrError) => {
		if (updateOrError instanceof TRPCError) {
			return updateOrError;
		}
		const matchedDebt = updatedDebts.find(
			(debt) => debt.id === updateOrError.debt.id,
		);
		/* c8 ignore start */
		if (!matchedDebt) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have an updated debt id "${updateOrError.debt.id}".`,
			});
		}
		/* c8 ignore stop */
		return {
			updatedAt: matchedDebt.updatedAt,
			reverseUpdated: localUserIds.includes(updateOrError.debt.userId)
				? undefined
				: reverseUpdatedDebtsIds.includes(updateOrError.debt.id),
		};
	});
});

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(queueUpdateDebt);
