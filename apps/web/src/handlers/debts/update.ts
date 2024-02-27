import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { nonNullishGuard, omitUndefined } from "~app/utils/utils";
import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { SimpleUpdateObject } from "~web/db/types";
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
			(obj) => Object.keys(obj).length !== 0,
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
				.onRef("usersTheir.ownerAccountId", "=", "accountSettings.accountId"),
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
			"accountSettings.accountId as foreignAccountId",
			"accountSettings.autoAcceptDebts",
			"usersTheir.id as theirUserId",
		])
		.execute();

const getSharedDebtData = (
	debts: Awaited<ReturnType<typeof fetchDebts>>,
	updatesWithErrors: (z.infer<typeof updateDebtSchema> | TRPCError)[],
) =>
	updatesWithErrors.map((maybeUpdate) => {
		if (maybeUpdate instanceof Error) {
			return null;
		}
		const matchedDebt = debts.find((debt) => debt.id === maybeUpdate.id)!;
		return { ...buildSetObjects(maybeUpdate, matchedDebt), debt: matchedDebt };
	});

const updateAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	sharedData: ReturnType<typeof getSharedDebtData>,
) => {
	const autoAcceptedData = sharedData.filter(
		(sharedDatum): sharedDatum is NonNullable<typeof sharedDatum> =>
			Boolean(sharedDatum?.debt.autoAcceptDebts),
	);
	if (autoAcceptedData.length === 0) {
		return [];
	}
	const { newDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		autoAcceptedData.map(({ setObject, reverseSetObject, debt }) => {
			/* c8 ignore start */
			if (!debt.foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			if (!debt.theirUserId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "theirUserId"`,
				});
			}
			/* c8 ignore stop */
			return {
				id: debt.id,
				ownerAccountId: debt.foreignAccountId,
				userId: debt.theirUserId,
				currencyCode: debt.currencyCode,
				amount: (-debt.amount).toString(),
				timestamp: debt.timestamp,
				lockedTimestamp: debt.lockedTimestamp,
				receiptId: debt.receiptId,
				created: new Date(),
				...reverseSetObject,
				// In case debt doesn't exist - we need to set a new note, not the old one
				note: setObject.note || debt.note,
				isNew: false,
			};
		}),
	);
	return sharedData
		.map((sharedDatum) => {
			if (
				!sharedDatum ||
				(sharedDatum.reverseSetObject?.lockedTimestamp === undefined &&
					!newDebts.some((debt) => sharedDatum.debt.id === debt.id))
			) {
				return;
			}
			return sharedDatum.debt.id;
		})
		.filter(nonNullishGuard);
};

const updateDebts = async (
	ctx: AuthorizedContext,
	sharedData: ReturnType<typeof getSharedDebtData>,
) =>
	ctx.database.transaction().execute((tx) =>
		Promise.all(
			sharedData.map((sharedDatum) => {
				if (!sharedDatum) {
					return null;
				}
				return tx
					.updateTable("debts")
					.set(sharedDatum.setObject)
					.where((eb) =>
						eb.and({
							id: sharedDatum.debt.id,
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
	const maybeUpdates = updates.map((update) => {
		const matchedDebt = debts.find((debt) => debt.id === update.id);
		if (!matchedDebt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${update.id}" does not exist on account "${ctx.auth.email}".`,
			});
		}
		return update;
	});
	const errors = maybeUpdates.filter(
		(maybeDebt): maybeDebt is TRPCError => maybeDebt instanceof Error,
	);
	if (maybeUpdates.length === errors.length) {
		return errors;
	}
	const sharedData = getSharedDebtData(debts, maybeUpdates);
	const updatedDebtIds = await updateAutoAcceptingDebts(ctx, sharedData);
	await updateDebts(ctx, sharedData);
	return maybeUpdates.map((maybeUpdate, index) => {
		if (maybeUpdate instanceof Error) {
			return maybeUpdate;
		}
		const sharedDatum = sharedData[index]!;
		return {
			lockedTimestamp: sharedDatum.setObject.lockedTimestamp,
			reverseLockedTimestampUpdated: updatedDebtIds.includes(
				sharedDatum.debt.id,
			),
		};
	});
});

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(queueUpdateDebt);
