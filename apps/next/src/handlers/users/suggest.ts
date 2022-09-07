import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { userItemSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	limitSchema,
	offsetSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

const SIMILARTY_THRESHOLD = 0.2;

export const procedure = authProcedure
	.input(
		z.strictObject({
			input: z.string().max(255),
			cursor: offsetSchema,
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
		})
	)
	.output(
		z.strictObject({
			items: z.array(userItemSchema),
			hasMore: z.boolean(),
			cursor: z.number(),
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		let filterIds = input.filterIds || [];
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
				ctx.auth.accountId
			);
			if (!accessRole) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to view receipt ${receiptId}.`,
				});
			}
			const userParticipants = await database
				.selectFrom("receiptParticipants")
				.innerJoin("users", (jb) =>
					jb.onRef("users.id", "=", "receiptParticipants.userId")
				)
				.where("receiptParticipants.receiptId", "=", input.options.receiptId)
				.select("users.id")
				.execute();
			filterIds = [...filterIds, ...userParticipants.map(({ id }) => id)];
		}
		const fuzzyMathedUsers = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id")
			)
			.if(filterIds.length !== 0, (qb) =>
				qb.where("users.id", "not in", filterIds)
			)
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.if(Boolean(input.options.type === "not-connected"), (qb) =>
				qb.where("users.connectedAccountId", "is", null)
			)
			// Typesystem doesn't know that we use account id as self user id
			.where("users.id", "<>", ctx.auth.accountId as UsersId)
			.where(
				sql`similarity(name, ${input.input})`.castTo<number>(),
				">",
				SIMILARTY_THRESHOLD
			)
			.select([
				"users.id",
				"name",
				"publicName",
				"accounts.email",
				"connectedAccountId as accountId",
			])
			.orderBy(sql`similarity(name, ${input.input})`.castTo(), "desc")
			.offset(input.cursor)
			.limit(input.limit + 1)
			.execute();
		const mappedUsers = fuzzyMathedUsers.map(
			({ accountId, email, ...user }) => ({
				...user,
				connectedAccount:
					accountId && email ? { id: accountId, email } : undefined,
			})
		);
		return {
			cursor: input.cursor,
			hasMore: mappedUsers.length === input.limit + 1,
			items: mappedUsers.slice(0, input.limit),
		};
	});
