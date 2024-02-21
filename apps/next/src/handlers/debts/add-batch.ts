import { TRPCError } from "@trpc/server";
import type { DatabaseError } from "pg";
import { z } from "zod";

import { nonNullishGuard } from "app/utils/utils";
import {
	MAX_BATCH_DEBTS,
	MIN_BATCH_DEBTS,
	debtAmountSchema,
	debtNoteSchema,
} from "app/utils/validation";
import type { DebtsId, UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import {
	currencyCodeSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

import {
	upsertAutoAcceptedDebts,
	withOwnerReceiptUserConstraint,
} from "./utils";

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

export const procedure = authProcedure
	.input(
		z
			.strictObject({
				note: debtNoteSchema,
				currencyCode: currencyCodeSchema,
				userId: userIdSchema,
				amount: debtAmountSchema,
				timestamp: z.date().optional(),
				receiptId: receiptIdSchema.optional(),
			})
			.array()
			.max(
				MAX_BATCH_DEBTS,
				`Maximum amount of batched debts is ${MAX_BATCH_DEBTS}`,
			)
			.min(
				MIN_BATCH_DEBTS,
				`Minimal amount of batched debts is ${MIN_BATCH_DEBTS}`,
			),
	)
	.mutation(async ({ input: debts, ctx }) => {
		const ids: DebtsId[] = debts.map(() => ctx.getUuid());
		const { database } = ctx;
		const userIds = [...new Set(debts.map(({ userId }) => userId))];
		const results = await database
			.selectFrom("users")
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.leftJoin("users as usersTheir", (qb) =>
				qb
					.onRef("usersTheir.ownerAccountId", "=", "accountSettings.accountId")
					.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId),
			)
			.select([
				"users.id",
				"usersTheir.id as theirUserId",
				"users.ownerAccountId as selfAccountId",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
			])
			.where("users.id", "in", userIds)
			.execute();
		if (results.length !== userIds.length) {
			const foundUserIds = results.map((user) => user.id);
			const missingUserIds = userIds.filter(
				(requestedUserId) => !foundUserIds.includes(requestedUserId),
			);
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `${
					missingUserIds.length === 1 ? "User" : "Users"
				} ${missingUserIds.map((userId) => `"${userId}"`).join(", ")} ${
					missingUserIds.length === 1 ? "does" : "do"
				} not exist.`,
			});
		}
		const foreignUsers = results.filter(
			({ selfAccountId }) => selfAccountId !== ctx.auth.accountId,
		);
		if (foreignUsers.length !== 0) {
			const foreignUserIds = foreignUsers.map((foreignUser) => foreignUser.id);
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `${
					foreignUserIds.length === 1 ? "User" : "Users"
				} ${foreignUserIds
					.sort()
					.map((userId) => `"${userId}"`)
					.join(", ")} ${
					foreignUserIds.length === 1 ? "is" : "are"
				} not owned by "${ctx.auth.email}".`,
			});
		}
		const hasSelfUser = results.some((user) => user.id === user.selfAccountId);
		if (hasSelfUser) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add debts for yourself.`,
			});
		}
		const autoAcceptingUsers = results.filter((user) => user.autoAcceptDebts);
		const lockedTimestamp = new Date();
		let reverseAcceptedUserIds: UsersId[] = [];
		let reverseData: { debtId?: DebtsId }[] = [];
		const commonParts = debts.map((debt, index) => ({
			id: ids[index]!,
			note: debt.note,
			currencyCode: debt.currencyCode,
			created: new Date(),
			timestamp: debt.timestamp || new Date(),
			lockedTimestamp,
			receiptId: debt.receiptId,
		}));
		if (autoAcceptingUsers.length !== 0) {
			const autoAcceptingResults = autoAcceptingUsers
				.map((user) =>
					user.foreignAccountId && user.theirUserId
						? {
								foreignAccountId: user.foreignAccountId,
								theirUserId: user.theirUserId,
								/* c8 ignore next 2 */
						  }
						: null,
				)
				.filter(nonNullishGuard);
			/* c8 ignore start */
			if (autoAcceptingResults.length !== autoAcceptingUsers.length) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			/* c8 ignore stop */
			const { updatedDebts } = await upsertAutoAcceptedDebts(
				database,
				commonParts
					.map((commonPart, index) => {
						const matchedDebt = debts[index]!;
						const matchedResult = results.find(
							(user) => matchedDebt.userId === user.id,
						)!;
						const matchedAutoAcceptingResult = autoAcceptingResults.find(
							(autoAcceptingResult) =>
								autoAcceptingResult.foreignAccountId ===
								matchedResult.foreignAccountId,
						);
						if (!matchedAutoAcceptingResult) {
							return null;
						}
						return {
							...commonPart,
							ownerAccountId: matchedAutoAcceptingResult.foreignAccountId,
							userId: matchedAutoAcceptingResult.theirUserId,
							amount: (-debts[index]!.amount).toString(),
							isNew: true,
						};
					})
					.filter(nonNullishGuard),
			);
			reverseData = commonParts.map((commonPart) => {
				const matchedUpdatedDebt = updatedDebts.find(
					(debt) => debt?.receiptId === commonPart.receiptId,
				);
				if (!matchedUpdatedDebt) {
					return {};
				}
				return { debtId: matchedUpdatedDebt.id };
			});
			reverseAcceptedUserIds = autoAcceptingUsers.map((user) => user.id);
		}
		const validatedIds = commonParts.map(
			(commonPart, index) => reverseData[index]?.debtId || commonPart.id,
		);
		await withOwnerReceiptUserConstraint(
			() =>
				database
					.insertInto("debts")
					.values(
						commonParts.map((commonPart, index) => ({
							...commonPart,
							id: validatedIds[index]!,
							ownerAccountId: ctx.auth.accountId,
							userId: debts[index]!.userId,
							amount: debts[index]!.amount.toString(),
						})),
					)
					.execute(),
			extractError,
		);
		return { ids: validatedIds, lockedTimestamp, reverseAcceptedUserIds };
	});
