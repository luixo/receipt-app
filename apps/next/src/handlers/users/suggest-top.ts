import * as trpc from "@trpc/server";
import { z } from "zod";

import { MONTH } from "app/utils/time";
import { userItemSchema } from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import {
	getAccessRole,
	getReceiptById,
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
		const { database } = ctx;
		const filterIds = input.filterIds || [];
		if (input.options.type === "not-connected-receipt") {
			const { receiptId } = input.options;
			const receipt = await getReceiptById(database, receiptId, [
				"id",
				"ownerAccountId",
			]);
			if (!receipt) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Receipt "${receiptId}" does not exist.`,
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
					message: `Not enough rights to view receipt "${receiptId}".`,
				});
			}
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
						.$if(filterIds.length !== 0, (qb) =>
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
				.orderBy("latestCount", "desc")
				.limit(input.limit)
				.execute();

			return {
				items: users.map(({ accountId, email, publicName, ...user }) => ({
					...user,
					publicName: publicName === null ? undefined : publicName,
					connectedAccount:
						accountId && email ? { id: accountId, email } : undefined,
				})),
			};
		}
		if (input.options.type === "not-connected") {
			const users = await database
				.selectFrom("users")
				.where("users.ownerAccountId", "=", ctx.auth.accountId)
				.where("users.connectedAccountId", "is", null)
				.leftJoin("debts", (qb) =>
					qb
						.onRef("debts.userId", "=", "users.id")
						.on("debts.timestamp", ">", new Date(Date.now() - MONTH)),
				)
				.$if(filterIds.length !== 0, (qb) =>
					qb.where("users.id", "not in", filterIds),
				)
				.select([
					"users.id",
					"users.name",
					"users.publicName",
					database.fn.count<string>("debts.id").as("latestCount"),
				])
				.groupBy("users.id")
				.orderBy("latestCount", "desc")
				.orderBy("users.id")
				.limit(input.limit)
				.execute();
			return {
				items: users.map(({ latestCount, publicName, ...user }) => ({
					publicName: publicName === null ? undefined : publicName,
					...user,
					connectedAccount: undefined,
				})),
			};
		}
		const users = await database
			.selectFrom("users")
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.where("users.id", "<>", ctx.auth.accountId as UsersId)
			.leftJoin("debts", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.on("debts.timestamp", ">", new Date(Date.now() - MONTH)),
			)
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id"),
			)
			.$if(filterIds.length !== 0, (qb) =>
				qb.where("users.id", "not in", filterIds),
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
			.limit(input.limit)
			.execute();

		return {
			items: users.map(
				({ latestCount, accountId, email, publicName, ...user }) => ({
					...user,
					publicName: publicName === null ? undefined : publicName,
					connectedAccount:
						accountId && email ? { id: accountId, email } : undefined,
				}),
			),
		};
	});
