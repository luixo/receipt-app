import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { debtNoteSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";
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
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users")
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.select([
				"users.ownerAccountId as selfAccountId",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
			])
			.where("id", "=", input.userId)
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.selfAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}
		const lockedTimestamp = new Date();
		let reverseAccepted = false;
		const commonPart = {
			id,
			note: input.note,
			currencyCode: input.currencyCode,
			created: new Date(),
			timestamp: input.timestamp || new Date(),
			lockedTimestamp,
		};
		if (user.autoAcceptDebts) {
			if (!user.foreignAccountId) {
				throw new trpc.TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			// TODO: incorporate reverse user into VALUES clause
			const reverseUser = await database
				.selectFrom("users")
				.where("users.ownerAccountId", "=", user.foreignAccountId)
				.where("users.connectedAccountId", "=", ctx.auth.accountId)
				.select("users.id")
				.executeTakeFirst();
			if (!reverseUser) {
				throw new trpc.TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having reverse user "id"`,
				});
			}
			await database
				.insertInto("debts")
				.values({
					...commonPart,
					ownerAccountId: user.foreignAccountId,
					userId: reverseUser.id,
					amount: (-input.amount).toString(),
				})
				.executeTakeFirst();
			reverseAccepted = true;
		}
		await database
			.insertInto("debts")
			.values({
				...commonPart,
				ownerAccountId: ctx.auth.accountId,
				userId: input.userId,
				amount: input.amount.toString(),
			})
			.executeTakeFirst();
		return { id, lockedTimestamp, reverseAccepted };
	});
