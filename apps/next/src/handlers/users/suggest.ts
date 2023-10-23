import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { MAX_SUGGEST_LENGTH, userItemSchema } from "app/utils/validation";
import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	limitSchema,
	offsetSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

const SIMILARTY_THRESHOLD = 0.33;

export const procedure = authProcedure
	.input(
		z.strictObject({
			input: z.string().max(MAX_SUGGEST_LENGTH),
			cursor: offsetSchema.optional(),
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
			hasMore: z.boolean(),
			cursor: z.number(),
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		let filterIds = input.filterIds || [];
		const cursor = input.cursor || 0;
		if (input.options.type === "not-connected-receipt") {
			const { receiptId } = input.options;
			const receipt = await getReceiptById(database, receiptId, [
				"id",
				"ownerAccountId",
			]);
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
			const userParticipants = await database
				.selectFrom("receiptParticipants")
				.innerJoin("users", (jb) =>
					jb.onRef("users.id", "=", "receiptParticipants.userId"),
				)
				.where("receiptParticipants.receiptId", "=", input.options.receiptId)
				.select("users.id")
				.execute();
			filterIds = [
				...new Set([...filterIds, ...userParticipants.map(({ id }) => id)]),
			];
		}
		const fuzzyMathedUsers = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id"),
			)
			.$if(filterIds.length !== 0, (qb) =>
				qb.where("users.id", "not in", filterIds),
			)
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.$if(Boolean(input.options.type === "not-connected"), (qb) =>
				qb.where("users.connectedAccountId", "is", null),
			)
			.$if(input.input.length < 3, (qb) =>
				qb.where("name", "ilike", `%${input.input}%`),
			)
			.$if(input.input.length >= 3, (qb) =>
				qb.where(
					sql`strict_word_similarity(${input.input}, name)`.castTo<number>(),
					">=",
					SIMILARTY_THRESHOLD,
				),
			)
			.select([
				"users.id",
				"name",
				"publicName",
				"accounts.email",
				"connectedAccountId as accountId",
			])
			.$if(input.input.length < 3, (qb) => qb.orderBy("name"))
			.$if(input.input.length >= 3, (qb) =>
				qb.orderBy(
					sql`strict_word_similarity(${input.input}, name)`.castTo(),
					"desc",
				),
			)
			// Stable order for users with the same name
			.orderBy("users.id")
			.offset(cursor)
			.limit(input.limit + 1)
			.execute();
		const mappedUsers = fuzzyMathedUsers.map(
			({ accountId, email, publicName, ...user }) => ({
				...user,
				publicName: publicName === null ? undefined : publicName,
				connectedAccount:
					accountId && email ? { id: accountId, email } : undefined,
			}),
		);
		return {
			cursor,
			hasMore: mappedUsers.length === input.limit + 1,
			items: mappedUsers.slice(0, input.limit),
		};
	});
