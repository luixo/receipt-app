import { TRPCError } from "@trpc/server";
import { isNonNullish, unique } from "remeda";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import type { DebtsId } from "~db/models";
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

const getData = async (
	ctx: AuthorizedContext,
	debts: readonly z.infer<typeof addDebtSchema>[],
) => {
	const userIds = unique(debts.map(({ userId }) => userId));
	const receiptUserTuples = unique(
		debts
			.map(({ receiptId, userId }) =>
				receiptId ? { receiptId, userId } : undefined,
			)
			.filter(isNonNullish),
	);
	const [users, debtReceiptTuples] = await Promise.all([
		ctx.database
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
			.execute(),
		receiptUserTuples.length === 0
			? []
			: ctx.database
					.selectFrom("debts")
					.where((eb) =>
						eb.or(
							receiptUserTuples.map(({ receiptId, userId }) =>
								eb.and({
									"debts.receiptId": receiptId,
									"debts.userId": userId,
								}),
							),
						),
					)
					.where("debts.ownerAccountId", "=", ctx.auth.accountId)
					.select(["debts.userId", "debts.receiptId"])
					.execute(),
	]);
	return { users, debtReceiptTuples };
};

const getDebtUserReceiptTupleId = (debt: z.infer<typeof addDebtSchema>) =>
	`${debt.userId}/${debt.receiptId}`;

const getMatchedUser = (
	debt: z.infer<typeof addDebtSchema>,
	users: Awaited<ReturnType<typeof getData>>["users"],
) => {
	const matchedUser = users.find((user) => user.userId === debt.userId);
	/* c8 ignore start */
	if (!matchedUser) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to have a matched user id "${debt.userId}".`,
		});
	}
	/* c8 ignore stop */
	return matchedUser;
};

const addAutoAcceptingDebts = async (
	ctx: AuthorizedContext,
	users: Awaited<ReturnType<typeof getData>>["users"],
	debts: (z.infer<typeof addDebtSchema> & { generatedId: DebtsId })[],
) => {
	const { updatedDebts, newDebts } = await upsertAutoAcceptedDebts(
		ctx.database,
		debts
			.map(({ generatedId, ...debt }) => {
				const user = getMatchedUser(debt, users);
				if (
					!user.foreignAccountId ||
					!user.theirUserId ||
					user.manualAcceptDebts
				) {
					return null;
				}
				return {
					id: generatedId,
					note: debt.note,
					currencyCode: debt.currencyCode,
					createdAt: new Date(),
					timestamp: debt.timestamp || new Date(),
					receiptId: debt.receiptId,
					ownerAccountId: user.foreignAccountId,
					userId: user.theirUserId,
					amount: (-debt.amount).toString(),
					isNew: true,
				};
			})
			.filter(isNonNullish),
	);
	const acceptingReverseUserIds = unique([
		...newDebts.map((debt) => debt.userId),
		...updatedDebts.map((debt) => debt.userId),
	]);
	const acceptedUserIds = acceptingReverseUserIds.map((reverseUserId) => {
		const matchedUser = users.find(
			(user) => user.theirUserId === reverseUserId,
		);
		/* c8 ignore start */
		if (!matchedUser) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a user for reverse user id "${reverseUserId}".`,
			});
		}
		/* c8 ignore stop */
		return matchedUser.userId;
	});
	return {
		reverseIdMap: debts.reduce<Partial<Record<string, DebtsId>>>(
			(acc, debt) => {
				if (!debt.receiptId) {
					return acc;
				}
				const matchedUser = getMatchedUser(debt, users);
				const matchedUpdatedDebt = updatedDebts.find(
					(lookupDebt) =>
						lookupDebt.receiptId === debt.receiptId &&
						lookupDebt.userId === matchedUser.theirUserId,
				);
				if (!matchedUpdatedDebt) {
					return acc;
				}
				return {
					...acc,
					[getDebtUserReceiptTupleId(debt)]: matchedUpdatedDebt.id,
				};
			},
			{},
		),
		acceptedUserIds,
	};
};

const addDebts = async (
	ctx: AuthorizedContext,
	debts: (z.infer<typeof addDebtSchema> & { generatedId: DebtsId })[],
	reverseIdMap: Awaited<
		ReturnType<typeof addAutoAcceptingDebts>
	>["reverseIdMap"],
) => {
	if (debts.length === 0) {
		return [];
	}
	const values = await ctx.database
		.insertInto("debts")
		.values(
			debts
				.map(({ generatedId, ...debt }) => ({
					id: reverseIdMap[getDebtUserReceiptTupleId(debt)] || generatedId,
					note: debt.note,
					currencyCode: debt.currencyCode,
					createdAt: new Date(),
					timestamp: debt.timestamp || new Date(),
					receiptId: debt.receiptId,
					ownerAccountId: ctx.auth.accountId,
					userId: debt.userId,
					amount: debt.amount.toString(),
				}))
				.filter(isNonNullish),
		)
		.returning(["debts.id", "debts.updatedAt"])
		.execute();
	return debts.map(({ generatedId, ...debt }) => {
		const id = reverseIdMap[getDebtUserReceiptTupleId(debt)] || generatedId;
		// We just added these value, should be returned in `values` variable
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const { updatedAt } = values.find(({ id: lookupId }) => lookupId === id)!;
		return { id, updatedAt };
	});
};

const queueAddDebt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addDebtSchema>,
	{
		id: DebtsId;
		updatedAt: Date;
		reverseAccepted: boolean;
	}
>((ctx) => async (inputs) => {
	const { users, debtReceiptTuples } = await getData(ctx, inputs);
	const debtsOrErrors = inputs.map((debt) => {
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
		const matchedDebtReceipt = debtReceiptTuples.find(
			({ userId, receiptId }) =>
				userId === debt.userId && receiptId === debt.receiptId,
		);
		if (matchedDebtReceipt) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `There is already a debt for user "${matchedDebtReceipt.userId}" in receipt "${matchedDebtReceipt.receiptId}".`,
			});
		}
		return { ...debt, generatedId: ctx.getUuid() as DebtsId };
	});
	const debts = debtsOrErrors.filter(
		(debtOrError): debtOrError is Exclude<typeof debtOrError, TRPCError> =>
			!(debtOrError instanceof TRPCError),
	);
	const { reverseIdMap, acceptedUserIds } = await addAutoAcceptingDebts(
		ctx,
		users,
		debts,
	);
	const addedDebts = await addDebts(ctx, debts, reverseIdMap);
	return debtsOrErrors.map((debtOrError) => {
		if (debtOrError instanceof TRPCError) {
			return debtOrError;
		}
		const id =
			reverseIdMap[getDebtUserReceiptTupleId(debtOrError)] ||
			debtOrError.generatedId;
		const matchedAddedDebt = addedDebts.find(
			(addedDebt) => addedDebt.id === id,
		);
		/* c8 ignore start */
		if (!matchedAddedDebt) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have matched added debt for id "${id}".`,
			});
		}
		/* c8 ignore stop */
		return {
			id,
			updatedAt: matchedAddedDebt.updatedAt,
			reverseAccepted: acceptedUserIds.includes(debtOrError.userId),
		};
	});
});

export const procedure = authProcedure
	.input(addDebtSchema)
	.mutation(queueAddDebt);
