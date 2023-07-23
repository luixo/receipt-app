import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import {
	MAX_BATCH_DEBTS,
	MIN_BATCH_DEBTS,
} from "app/mutations/debts/add-batch";
import { debtNoteSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";
import { getUsersByIds } from "next-app/handlers/users/utils";
import {
	debtAmountSchema,
	currencyCodeSchema,
	userIdSchema,
} from "next-app/handlers/validation";

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
	.mutation(async ({ input, ctx }) => {
		const ids = input.map(() => v4());
		const database = getDatabase(ctx);
		const userIds = [...new Set(input.map(({ userId }) => userId))];
		const users = await getUsersByIds(database, userIds, [
			"ownerAccountId",
			"id",
		]);
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
			({ ownerAccountId }) => ownerAccountId !== ctx.auth.accountId,
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
		await database
			.insertInto("debts")
			.values(
				input.map((debt, index) => ({
					id: ids[index]!,
					ownerAccountId: ctx.auth.accountId,
					userId: debt.userId,
					note: debt.note,
					currencyCode: debt.currencyCode,
					created: new Date(),
					timestamp: debt.timestamp || new Date(),
					amount: debt.amount.toString(),
				})),
			)
			.execute();
		return ids;
	});
