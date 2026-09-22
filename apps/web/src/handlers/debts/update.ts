import { TRPCError } from "@trpc/server";
import type { Updateable } from "kysely";
import { isNonNullish, keys, omitBy, unique } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { DB } from "~db/types.gen";
import { temporalSchemas } from "~utils/temporal";
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
			timestamp: temporalSchemas.plainDate,
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

type DebtUpdateObject = Updateable<DB["debts"]>;

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
		.innerJoin("peers", (qb) =>
			qb
				.onRef("peers.id", "=", "debts.peerId")
				.onRef("peers.ownerAccountId", "=", "debts.ownerAccountId"),
		)
		.leftJoin("accountSettings", (qb) =>
			qb.onRef("peers.connectedAccountId", "=", "accountSettings.accountId"),
		)
		.leftJoin("peers as peersTheir", (qb) =>
			qb
				.onRef("peersTheir.connectedAccountId", "=", "debts.ownerAccountId")
				.onRef("peersTheir.ownerAccountId", "=", "peers.connectedAccountId"),
		)
		.select([
			"debts.id",
			"debts.peerId",
			"debts.updatedAt",
			"debts.note",
			"debts.currencyCode",
			"debts.amount",
			"debts.timestamp",
			"debts.receiptId",
			"peers.connectedAccountId as foreignAccountId",
			"accountSettings.manualAcceptDebts",
			"peersTheir.id as theirPeerId",
		])
		.execute();

type Debt = Awaited<ReturnType<typeof fetchDebts>>[number];
type UpdateWithDebt = ReturnType<typeof buildSetObjects> & {
	debt: Debt;
};

const mergeSetObjects = <T extends DebtUpdateObject>(
	setObjectA: T,
	setObjectB: T,
): T => ({ ...setObjectA, ...setObjectB });

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
				reverseSetObject: mergeSetObjects(
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
				debt.theirPeerId
			) {
				return {
					id: debt.id,
					ownerAccountId: debt.foreignAccountId,
					peerId: debt.theirPeerId,
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
		updatedAt: Temporal.ZonedDateTime;
		// `undefined` signifies that peer is local
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
	const localPeerIds = unique(
		debts
			.filter((debt) => debt.foreignAccountId === null)
			.map((debt) => debt.peerId),
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
			reverseUpdated: localPeerIds.includes(updateOrError.debt.peerId)
				? undefined
				: reverseUpdatedDebtsIds.includes(updateOrError.debt.id),
		};
	});
});

export const procedure = authProcedure
	.meta({
		title: "Update debt",
		description:
			"Updates a debt owned by the current account, auto-updating the counterparty's mirrored debt unless they require manual acceptance.",
	})
	.input(updateDebtSchema)
	.mutation(queueUpdateDebt);
