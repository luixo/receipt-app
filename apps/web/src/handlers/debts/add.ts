import { TRPCError } from "@trpc/server";
import type { DatabaseError } from "pg";
import { isNonNullish } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import { DEBTS } from "~db";
import type { DebtsId } from "~db";
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
	// We checked for detail above
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
	const [, receiptId, userId] = detailMatch as [string, string, string];
	return { receiptId, userId };
};

const getUsers = async (
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

const isError = <T>(input: T | TRPCError): input is TRPCError =>
	input instanceof TRPCError;

type User = Awaited<ReturnType<typeof getUsers>>[number];

const getDataDebtsWithErrors = (
	ctx: AuthorizedContext,
	debtsWithErrors: readonly (
		| {
				debt: z.infer<typeof addDebtSchema>;
				user: User;
		  }
		| TRPCError
	)[],
	lockedTimestamp: Date,
) =>
	debtsWithErrors.map((debtOrError) => {
		if (debtOrError instanceof Error) {
			return debtOrError;
		}
		const { debt, user } = debtOrError;
		return {
			debt,
			user,
			data: {
				id: ctx.getUuid(),
				note: debt.note,
				currencyCode: debt.currencyCode,
				created: new Date(),
				timestamp: debt.timestamp || new Date(),
				lockedTimestamp,
				receiptId: debt.receiptId,
			},
		};
	});

const addAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	dataDebtsWithErrors: ReturnType<typeof getDataDebtsWithErrors>,
) => {
	const autoAcceptingData = dataDebtsWithErrors
		.map((dataDebtOrErrors) => {
			if (isError(dataDebtOrErrors)) {
				return null;
			}
			const { user } = dataDebtOrErrors;
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
		.filter(isNonNullish);
	if (autoAcceptingData.length === 0) {
		return {
			reverseIds: [],
			acceptedUserIds: [],
		};
	}
	const { updatedDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		dataDebtsWithErrors
			.map((dataDebtOrError) => {
				if (isError(dataDebtOrError)) {
					return null;
				}
				const { debt, data, user } = dataDebtOrError;
				const matchedAutoAcceptingResult = autoAcceptingData.find(
					(autoAcceptingResult) =>
						autoAcceptingResult.foreignAccountId === user.foreignAccountId,
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
			.filter(isNonNullish),
	);
	return {
		reverseIds: dataDebtsWithErrors.map((dataDebtOrError) => {
			if (isError(dataDebtOrError)) {
				return;
			}
			const matchedUpdatedDebt = updatedDebts.find(
				(debt) => debt?.receiptId === dataDebtOrError.data.receiptId,
			);
			if (!matchedUpdatedDebt) {
				return;
			}
			return matchedUpdatedDebt.id;
		}),
		acceptedUserIds: autoAcceptingData.map((result) => result.userId),
	};
};

type DataDebtOrError = NonNullable<
	ReturnType<typeof getDataDebtsWithErrors>[number]
>;

const addDebts = async (
	ctx: AuthorizedContext,
	dataDebtsWithErrors: (
		| TRPCError
		| (Exclude<DataDebtOrError, TRPCError> & {
				validatedId: DebtsId;
		  })
	)[],
) => {
	try {
		await ctx.database
			.insertInto("debts")
			.values(
				dataDebtsWithErrors
					.map((dataDebtOrError) => {
						if (isError(dataDebtOrError)) {
							return null;
						}
						const { debt, data, validatedId } = dataDebtOrError;
						return {
							...data,
							id: validatedId,
							ownerAccountId: ctx.auth.accountId,
							userId: debt.userId,
							amount: debt.amount.toString(),
						};
					})
					.filter(isNonNullish),
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
	const users = await getUsers(ctx, debts);
	const debtsOrErrors = debts.map((debt) => {
		const matchedUser = users.find((result) => result.userId === debt.userId);
		if (!matchedUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User "${debt.userId}" does not exist.`,
			});
		}
		if (matchedUser.selfAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `User "${debt.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (debt.userId === matchedUser.selfAccountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add a debt for yourself.`,
			});
		}
		return { debt, user: matchedUser };
	});
	const errors = debtsOrErrors.filter(isError);
	if (debtsOrErrors.length === errors.length) {
		return errors;
	}
	const lockedTimestamp = new Date();
	const dataDebtsWithErrors = getDataDebtsWithErrors(
		ctx,
		debtsOrErrors,
		lockedTimestamp,
	);
	const { reverseIds, acceptedUserIds } = await addAutoAcceptingDebts(
		ctx,
		dataDebtsWithErrors,
	);
	const validatedDataDebtsWithErrors = dataDebtsWithErrors.map(
		(dataDebtOrError, index) =>
			!isError(dataDebtOrError)
				? {
						...dataDebtOrError,
						validatedId: reverseIds[index] || dataDebtOrError.data.id,
				  }
				: dataDebtOrError,
	);
	await addDebts(ctx, validatedDataDebtsWithErrors);

	return validatedDataDebtsWithErrors.map((dataDebtOrError) => {
		if (isError(dataDebtOrError)) {
			return dataDebtOrError;
		}
		return {
			id: dataDebtOrError.validatedId,
			lockedTimestamp,
			reverseAccepted: acceptedUserIds.includes(dataDebtOrError.debt.userId),
		};
	});
});

export const procedure = authProcedure
	.input(addDebtSchema)
	.mutation(queueAddDebt);
