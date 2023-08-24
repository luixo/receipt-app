import * as trpc from "@trpc/server";
import { z } from "zod";

import { nonNullishGuard } from "app/utils/utils";
import {
	MAX_BATCH_DEBTS,
	MIN_BATCH_DEBTS,
	debtNoteSchema,
} from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import {
	currencyCodeSchema,
	debtAmountSchema,
	userIdSchema,
} from "next-app/handlers/validation";
import { getUuid } from "next-app/utils/crypto";

export const procedure = authProcedure
	.input(
		z
			.strictObject({
				note: debtNoteSchema,
				currencyCode: currencyCodeSchema,
				userId: userIdSchema,
				amount: debtAmountSchema,
				timestamp: z.date().optional(),
			})
			.array()
			.max(
				MAX_BATCH_DEBTS,
				`Maximum amount of batched debts is ${MAX_BATCH_DEBTS}`,
			)
			.min(
				MIN_BATCH_DEBTS,
				`Minimum amount of batched debts is ${MIN_BATCH_DEBTS}`,
			),
	)
	.mutation(async ({ input: debts, ctx }) => {
		const ids = debts.map(() => getUuid());
		const { database } = ctx;
		const userIds = [...new Set(debts.map(({ userId }) => userId))];
		const users = await database
			.selectFrom("users")
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.select([
				"users.id",
				"users.ownerAccountId as selfAccountId",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
			])
			.where("users.id", "in", userIds)
			.execute();
		if (users.length !== userIds.length) {
			const foundUserIds = users.map((user) => user.id);
			const missingUserIds = userIds.filter(
				(requestedUserId) => !foundUserIds.includes(requestedUserId),
			);
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Users ${missingUserIds.join(", ")} do not exist.`,
			});
		}
		const foreignUsers = users.filter(
			({ selfAccountId }) => selfAccountId !== ctx.auth.accountId,
		);
		if (foreignUsers.length !== 0) {
			const foreignUserIds = foreignUsers.map((foreignUser) => foreignUser.id);
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Users ${foreignUserIds.join(", ")} are not owned by ${
					ctx.auth.accountId
				}.`,
			});
		}
		const autoAcceptingUsers = users.filter((user) => user.autoAcceptDebts);
		const lockedTimestamp = new Date();
		let reverseAcceptedUserIds: UsersId[] = [];
		const commonParts = debts.map((debt, index) => ({
			id: ids[index]!,
			note: debt.note,
			currencyCode: debt.currencyCode,
			created: new Date(),
			timestamp: debt.timestamp || new Date(),
			lockedTimestamp,
		}));
		if (autoAcceptingUsers.length !== 0) {
			const autoAcceptingUsersAccountIds = autoAcceptingUsers
				.map((user) => user.foreignAccountId)
				.filter(nonNullishGuard);
			if (autoAcceptingUsersAccountIds.length !== autoAcceptingUsers.length) {
				throw new trpc.TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			// TODO: incorporate reverse user into VALUES clause
			const reverseAutoAcceptingUsers = await database
				.selectFrom("users")
				.where("users.ownerAccountId", "in", autoAcceptingUsersAccountIds)
				.where("users.connectedAccountId", "=", ctx.auth.accountId)
				.select(["users.ownerAccountId", "users.id"])
				.execute();
			if (
				reverseAutoAcceptingUsers.length !== autoAcceptingUsersAccountIds.length
			) {
				throw new trpc.TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having reverse user "id"`,
				});
			}
			await database
				.insertInto("debts")
				.values(
					commonParts
						.map((commonPart, index) => {
							const matchedDebt = debts[index]!;
							const matchedUser = users.find(
								(user) => matchedDebt.userId === user.id,
							)!;
							const matchedReverseUser = reverseAutoAcceptingUsers.find(
								(reverseUser) =>
									reverseUser.ownerAccountId === matchedUser.foreignAccountId,
							);
							if (!matchedReverseUser) {
								return null;
							}
							return {
								...commonPart,
								ownerAccountId: ctx.auth.accountId,
								userId: debts[index]!.userId,
								amount: debts[index]!.amount.toString(),
							};
						})
						.filter(nonNullishGuard),
				)
				.executeTakeFirst();
			reverseAcceptedUserIds = autoAcceptingUsers.map((user) => user.id);
		}
		await database
			.insertInto("debts")
			.values(
				commonParts.map((commonPart, index) => ({
					...commonPart,
					ownerAccountId: ctx.auth.accountId,
					userId: debts[index]!.userId,
					amount: debts[index]!.amount.toString(),
				})),
			)
			.execute();
		return { ids, lockedTimestamp, reverseAcceptedUserIds };
	});
