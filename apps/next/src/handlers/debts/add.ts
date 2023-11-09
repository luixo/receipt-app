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

import { withOwnerReceiptUserConstraint } from "./utils";

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
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (user.selfAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (input.userId === user.selfAccountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Cannot add a debt for yourself.`,
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
			receiptId: input.receiptId,
		};
		if (user.autoAcceptDebts) {
			const { foreignAccountId } = user;
			if (!foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			// TODO: incorporate reverse user into VALUES clause
			const reverseUser = await database
				.selectFrom("users")
				.where("users.ownerAccountId", "=", foreignAccountId)
				.where("users.connectedAccountId", "=", ctx.auth.accountId)
				.select("users.id")
				.executeTakeFirstOrThrow(
					() =>
						new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `Unexpected having "autoAcceptDebts" but not having reverse user "id"`,
						}),
				);
			await withOwnerReceiptUserConstraint(
				() =>
					database
						.insertInto("debts")
						.values({
							...commonPart,
							ownerAccountId: foreignAccountId,
							userId: reverseUser.id,
							amount: (-input.amount).toString(),
						})
						.executeTakeFirst(),
				() => ({ receiptId: input.receiptId!, userId: reverseUser.id }),
			);
			reverseAccepted = true;
		}
		await withOwnerReceiptUserConstraint(
			() =>
				database
					.insertInto("debts")
					.values({
						...commonPart,
						ownerAccountId: ctx.auth.accountId,
						userId: input.userId,
						amount: input.amount.toString(),
					})
					.executeTakeFirst(),
			() => ({ receiptId: input.receiptId!, userId: input.userId }),
		);
		return { id, lockedTimestamp, reverseAccepted };
	});
