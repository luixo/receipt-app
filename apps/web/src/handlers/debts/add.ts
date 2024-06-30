import { TRPCError } from "@trpc/server";
import type { DatabaseError } from "pg";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import { DEBTS } from "~db";
import type { DebtsId } from "~db";
import { nonNullishGuard } from "~utils";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	currencyCodeSchema,
	receiptIdSchema,
	userIdSchema,
} from "~web/handlers/validation";

import { upsertAutoAcceptedDebts } from "./utils";

const addDebtSchema = z.strictObject({
	note: debtNoteSchema,
	currencyCode: currencyCodeSchema,
	userId: userIdSchema,
	amount: debtAmountSchema,
	timestamp: z.date().optional(),
	receiptId: receiptIdSchema.optional(),
});

const extractError = (e: unknown) => {
	/* c8 ignore start */
	if (
		typeof e !== "object" ||
		!e ||
		!("detail" in e) ||
		typeof e.detail !== "string"
	) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Error is not of type 'DatabaseError': ${String(e)}`,
		});
	}
	/* c8 ignore stop */
	const typedMessage = e as DatabaseError;
	const detailMatch = typedMessage.detail!.match(
		/\("ownerAccountId", "receiptId", "userId"\)=\([a-z0-9-]+, ([a-z0-9-]+), ([a-z0-9-]+)\) already exists/,
	);
	/* c8 ignore start */
	if (!detailMatch) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Detail didn't match expected constraint message: ${typedMessage.detail}`,
		});
	}
	/* c8 ignore stop */
	const [, receiptId, userId] = detailMatch;
	return { receiptId: receiptId!, userId: userId! };
};

const getResults = async (
	ctx: AuthorizedContext,
	debts: readonly z.infer<typeof addDebtSchema>[],
) => {
	const { database } = ctx;
	const userIds = [...new Set(debts.map(({ userId }) => userId))];
	return database
		.selectFrom("users")
		.leftJoin("accountSettings", (qb) =>
			qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
		)
		.leftJoin("users as usersTheir", (qb) =>
			qb
				.onRef("usersTheir.ownerAccountId", "=", "users.connectedAccountId")
				.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"users.id as userId",
			"users.ownerAccountId as selfAccountId",
			"users.connectedAccountId as foreignAccountId",
			"usersTheir.id as theirUserId",
			"accountSettings.manualAcceptDebts",
		])
		.where("users.id", "in", userIds)
		.execute();
};

const getSharedDebtData = (
	ctx: AuthorizedContext,
	debtsWithErrors: readonly (z.infer<typeof addDebtSchema> | TRPCError)[],
	lockedTimestamp: Date,
) =>
	debtsWithErrors.map((maybeDebt) => {
		if (maybeDebt instanceof Error) {
			return null;
		}
		return {
			debt: maybeDebt,
			data: {
				id: ctx.getUuid(),
				note: maybeDebt.note,
				currencyCode: maybeDebt.currencyCode,
				created: new Date(),
				timestamp: maybeDebt.timestamp || new Date(),
				lockedTimestamp,
				receiptId: maybeDebt.receiptId,
			},
		};
	});

const addAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	results: Awaited<ReturnType<typeof getResults>>,
	sharedData: ReturnType<typeof getSharedDebtData>,
) => {
	const autoAcceptingData = results
		.map((user) => {
			if (
				user.foreignAccountId &&
				user.theirUserId &&
				!user.manualAcceptDebts
			) {
				return {
					foreignAccountId: user.foreignAccountId,
					theirUserId: user.theirUserId,
					userId: user.userId,
					/* c8 ignore next 2 */
				};
			}
			return null;
		})
		.filter(nonNullishGuard);
	if (autoAcceptingData.length === 0) {
		return {
			reverseIds: [],
			acceptedUserIds: [],
		};
	}
	const { updatedDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		sharedData
			.map((sharedDatum) => {
				if (!sharedDatum) {
					return null;
				}
				const { debt, data } = sharedDatum;
				const matchedResult = results.find(
					(result) => debt.userId === result.userId,
				)!;
				const matchedAutoAcceptingResult = autoAcceptingData.find(
					(autoAcceptingResult) =>
						autoAcceptingResult.foreignAccountId ===
						matchedResult.foreignAccountId,
				);
				if (!matchedAutoAcceptingResult) {
					return null;
				}
				return {
					...data,
					ownerAccountId: matchedAutoAcceptingResult.foreignAccountId,
					userId: matchedAutoAcceptingResult.theirUserId,
					amount: (-debt.amount).toString(),
					isNew: true,
				};
			})
			.filter(nonNullishGuard),
	);
	return {
		reverseIds: sharedData.map((sharedDatum) => {
			if (!sharedDatum) {
				return;
			}
			const matchedUpdatedDebt = updatedDebts.find(
				(debt) => debt?.receiptId === sharedDatum.data.receiptId,
			);
			if (!matchedUpdatedDebt) {
				return;
			}
			return matchedUpdatedDebt.id;
		}),
		acceptedUserIds: autoAcceptingData.map((result) => result.userId),
	};
};

const addDebts = async (
	ctx: AuthorizedContext,
	sharedData: ReturnType<typeof getSharedDebtData>,
	validatedIds: DebtsId[],
) => {
	try {
		await ctx.database
			.insertInto("debts")
			.values(
				sharedData
					.map((sharedDatum, index) => {
						if (!sharedDatum) {
							return null;
						}
						const { debt, data } = sharedDatum;
						return {
							...data,
							id: validatedIds[index]!,
							ownerAccountId: ctx.auth.accountId,
							userId: debt.userId,
							amount: debt.amount.toString(),
						};
					})
					.filter(nonNullishGuard),
			)
			.execute();
	} catch (e) {
		// Could be like `duplicate key value violates unique constraint "..."`
		const message = String(e);
		if (message.includes(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)) {
			const { receiptId, userId } = extractError(e);
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

const queueAddDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addDebtSchema>,
	{
		id: DebtsId;
		lockedTimestamp: Date;
		reverseAccepted: boolean;
	}
>((ctx) => async (debts) => {
	const results = await getResults(ctx, debts);
	const maybeDebts = debts.map((debt) => {
		const matchedResult = results.find(
			(result) => result.userId === debt.userId,
		);
		if (!matchedResult) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User "${debt.userId}" does not exist.`,
			});
		}
		if (matchedResult.selfAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `User "${debt.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (debt.userId === matchedResult.selfAccountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add a debt for yourself.`,
			});
		}
		return debt;
	});
	const errors = maybeDebts.filter(
		(maybeDebt): maybeDebt is TRPCError => maybeDebt instanceof Error,
	);
	if (maybeDebts.length === errors.length) {
		return errors;
	}
	const lockedTimestamp = new Date();
	const sharedData = getSharedDebtData(ctx, maybeDebts, lockedTimestamp);
	const { reverseIds, acceptedUserIds } = await addAutoAcceptingDebts(
		ctx,
		results,
		sharedData,
	);
	const validatedIds = sharedData.map((sharedDatum, index) =>
		sharedDatum ? reverseIds[index] || sharedDatum.data.id : "never",
	);
	await addDebts(ctx, sharedData, validatedIds);

	return maybeDebts.map((maybeDebt, index) => {
		if (maybeDebt instanceof Error) {
			return maybeDebt;
		}
		return {
			id: validatedIds[index]!,
			lockedTimestamp,
			reverseAccepted: acceptedUserIds.includes(maybeDebt.userId),
		};
	});
});

export const procedure = authProcedure
	.input(addDebtSchema)
	.mutation(queueAddDebt);
