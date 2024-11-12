import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { UsersId } from "~db/models";
import { MONTH } from "~utils/time";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import {
	limitSchema,
	receiptIdSchema,
	userIdSchema,
} from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			limit: limitSchema,
			filterIds: z.array(userIdSchema).optional(),
			options: z
				.discriminatedUnion("type", [
					z.strictObject({
						type: z.literal("not-connected"),
					}),
					z.strictObject({
						type: z.literal("not-connected-receipt"),
						receiptId: receiptIdSchema,
					}),
				])
				.optional(),
		}),
	)
	.output(z.strictObject({ items: z.array(userIdSchema) }))
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const filterIds = [
			...(input.filterIds || []),
			ctx.auth.accountId as UsersId,
		];
		const options = input.options || { type: "all" };
		if (options.type === "not-connected-receipt") {
			const { receiptId } = options;
			const receipt = await database
				.selectFrom("receipts")
				.select(["ownerAccountId", "id"])
				.where("id", "=", receiptId)
				.limit(1)
				.executeTakeFirst();
			if (!receipt) {
				throw new TRPCError({
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
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to view receipt "${receiptId}".`,
				});
			}
			const users = await database
				.with("orderedUsers", (qc) =>
					qc
						.selectFrom("users")
						.where((eb) =>
							eb("users.ownerAccountId", "=", ctx.auth.accountId).and(
								"users.id",
								"not in",
								(ebb) =>
									ebb
										.selectFrom("receiptParticipants")
										.innerJoin("users", (jb) =>
											jb.onRef("users.id", "=", "receiptParticipants.userId"),
										)
										.where("receiptParticipants.receiptId", "=", receiptId)
										.select("users.id"),
							),
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
						])
						.groupBy("users.id")
						.orderBy("users.id"),
				)
				.selectFrom("orderedUsers")
				.select(["id"])
				.orderBy("latestCount desc")
				.limit(input.limit)
				.execute();

			return {
				items: users.map(({ id }) => id),
			};
		}
		if (options.type === "not-connected") {
			const users = await database
				.selectFrom("users")
				.where((eb) =>
					eb.and([
						eb("users.ownerAccountId", "=", ctx.auth.accountId),
						eb("users.connectedAccountId", "is", null),
					]),
				)
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
					database.fn.count<string>("debts.id").as("latestCount"),
				])
				.groupBy(["users.id"])
				.orderBy(["latestCount desc", "users.id"])
				.limit(input.limit)
				.execute();
			return { items: users.map(({ id }) => id) };
		}
		const users = await database
			.selectFrom("users")
			.where((eb) =>
				eb("users.ownerAccountId", "=", ctx.auth.accountId).and(
					"users.id",
					"<>",
					ctx.auth.accountId as UsersId,
				),
			)
			.leftJoin("debts", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.on("debts.timestamp", ">", new Date(Date.now() - MONTH)),
			)
			.$if(filterIds.length !== 0, (qb) =>
				qb.where("users.id", "not in", filterIds),
			)
			.select([
				"users.id",
				database.fn.count<string>("debts.id").as("latestCount"),
			])
			.groupBy("users.id")
			.orderBy(["latestCount desc", "users.id"])
			.limit(input.limit)
			.execute();

		return { items: users.map(({ id }) => id) };
	});
