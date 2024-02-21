import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "app/utils/validation";
import type { DebtsId } from "next-app/db/models";
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

export const procedure = authProcedure
	.input(
		z.strictObject({
			note: debtNoteSchema,
			currencyCode: currencyCodeSchema,
			userId: userIdSchema,
			amount: debtAmountSchema,
			timestamp: z.date().optional(),
			receiptId: receiptIdSchema.optional(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const id: DebtsId = ctx.getUuid();
		const { database } = ctx;
		const result = await database
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
				"users.ownerAccountId as selfAccountId",
				"usersTheir.id as theirUserId",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
			])
			.where("users.id", "=", input.userId)
			.executeTakeFirst();
		if (!result) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (result.selfAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (input.userId === result.selfAccountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add a debt for yourself.`,
			});
		}
		const lockedTimestamp = new Date();
		let reverseData: undefined | { debtId?: DebtsId };
		const commonPart = {
			id,
			note: input.note,
			currencyCode: input.currencyCode,
			created: new Date(),
			timestamp: input.timestamp || new Date(),
			lockedTimestamp,
			receiptId: input.receiptId,
		};
		if (result.autoAcceptDebts) {
			const { foreignAccountId } = result;
			/* c8 ignore start */
			if (!foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			if (!result.theirUserId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "userId"`,
				});
			}
			/* c8 ignore stop */
			const { updatedDebts } = await upsertAutoAcceptedDebts(database, [
				{
					...commonPart,
					ownerAccountId: foreignAccountId,
					userId: result.theirUserId,
					amount: (-input.amount).toString(),
					isNew: true,
				},
			]);
			if (updatedDebts.length !== 0) {
				reverseData = { debtId: updatedDebts[0]!.id };
			} else {
				reverseData = {};
			}
		}
		const validatedId = reverseData?.debtId || commonPart.id;
		await withOwnerReceiptUserConstraint(
			() =>
				database
					.insertInto("debts")
					.values({
						...commonPart,
						id: validatedId,
						ownerAccountId: ctx.auth.accountId,
						userId: input.userId,
						amount: input.amount.toString(),
					})
					.executeTakeFirst(),
			() => ({ receiptId: input.receiptId!, userId: input.userId }),
		);
		return {
			id: validatedId,
			lockedTimestamp,
			reverseAccepted: Boolean(reverseData),
		};
	});
