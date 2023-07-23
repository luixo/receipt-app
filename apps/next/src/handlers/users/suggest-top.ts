import * as trpc from "@trpc/server";
import { z } from "zod";

import { MONTH } from "app/utils/time";
import { userItemSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	limitSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			limit: limitSchema,
			filterIds: z.array(userIdSchema).optional(),
			options: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("not-connected"),
				}),
				z.strictObject({
					type: z.literal("not-connected-receipt"),
					receiptId: receiptIdSchema,
				}),
				z.strictObject({
					type: z.literal("debts"),
				}),
			]),
		}),
	)
	.output(
		z.strictObject({
			items: z.array(userItemSchema),
		}),
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		if (input.options.type === "not-connected-receipt") {
			const { receiptId } = input.options;
			const receipt = await getReceiptById(database, receiptId, [
				"id",
				"ownerAccountId",
			]);
			if (!receipt) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Receipt ${receiptId} does not exist.`,
				});
			}
			const accessRole = await getAccessRole(
				database,
				receipt,
				ctx.auth.accountId,
			);
			if (!accessRole) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to view receipt ${receiptId}.`,
				});
			}
			const filterIds = input.filterIds || [];
			const users = await database
				.with("orderedUsers", (qc) =>
					qc
						.selectFrom("users")
						.where("users.ownerAccountId", "=", ctx.auth.accountId)
						.where("users.id", "not in", (eb) =>
							eb
								.selectFrom("receiptParticipants")
								.innerJoin("users", (jb) =>
									jb.onRef("users.id", "=", "receiptParticipants.userId"),
								)
								.where("receiptParticipants.receiptId", "=", receiptId)
								.select("users.id"),
						)
						.leftJoin("accounts", (qb) =>
							qb.onRef("connectedAccountId", "=", "accounts.id"),
						)
						.if(filterIds.length !== 0, (qb) =>
							qb.where("users.id", "not in", filterIds),
						)
						.leftJoin("receiptParticipants", (qb) =>
							qb.onRef("receiptParticipants.userId", "=", "users.id"),
						)
						.leftJoin("receipts", (qb) =>
							qb
								.onRef("receiptParticipants.receiptId", "=", "receipts.id")
								.on("receipts.issued", ">", new Date(Date.now() - MONTH)),
						)
						.distinctOn(["users.id"])
						.select([
							"users.id",
							database.fn.count<string>("receipts.id").as("latestCount"),
							"users.name",
							"users.publicName",
							"users.connectedAccountId as accountId",
							"accounts.email",
						])
						.groupBy("users.id")
						.groupBy("accounts.email")
						.orderBy("users.id"),
				)
				.selectFrom("orderedUsers")
				.select(["id", "name", "publicName", "accountId", "email"])
				.where("latestCount", "<>", "0")
				.orderBy("latestCount", "desc")
				.limit(input.limit)
				.execute();

			return {
				items: users
					.map(({ accountId, email, ...user }) => ({
						...user,
						connectedAccount:
							accountId && email ? { id: accountId, email } : undefined,
					}))
					.slice(0, input.limit),
			};
		}
		const users = await database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.where("debts.timestamp", ">", new Date(Date.now() - MONTH))
			.innerJoin("users", (qb) => qb.onRef("users.id", "=", "debts.userId"))
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id"),
			)
			.select([
				"users.id",
				"users.name",
				"users.publicName",
				"users.connectedAccountId as accountId",
				"accounts.email",
				database.fn.count<string>("debts.id").as("latestCount"),
			])
			.groupBy("users.id")
			.groupBy("accounts.email")
			.orderBy("latestCount", "desc")
			.orderBy("users.id")
			.execute();

		return {
			items: users
				.map(({ latestCount, accountId, email, ...user }) => ({
					...user,
					connectedAccount:
						accountId && email ? { id: accountId, email } : undefined,
				}))
				.slice(0, input.limit),
		};
	});
