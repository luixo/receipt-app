import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { debtNoteSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import {
	debtAmountSchema,
	currencyCodeSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			note: debtNoteSchema,
			currencyCode: currencyCodeSchema,
			userId: userIdSchema,
			amount: debtAmountSchema,
			timestamp: z.date().optional(),
		})
	)
	.mutation(async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}
		await database
			.insertInto("debts")
			.values({
				id,
				ownerAccountId: ctx.auth.accountId,
				userId: input.userId,
				note: input.note,
				currencyCode: input.currencyCode,
				created: new Date(),
				timestamp: input.timestamp || new Date(),
				amount: input.amount.toString(),
			})
			.executeTakeFirst();
		return id;
	});
