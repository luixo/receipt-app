import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod/v4";

import { MAX_SUGGEST_LENGTH } from "~app/utils/validation";
import type { UsersId } from "~db/models";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import {
	limitSchema,
	offsetSchema,
	receiptIdSchema,
	userIdSchema,
} from "~web/handlers/validation";

const SIMILARTY_THRESHOLD = 0.33;

export const procedure = authProcedure
	.input(
		z.strictObject({
			input: z.string().max(MAX_SUGGEST_LENGTH),
			cursor: offsetSchema.optional(),
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
			direction: z.enum(["forward", "backward"]),
		}),
	)
	.output(
		z.strictObject({
			items: z.array(userIdSchema),
			hasMore: z.boolean(),
			cursor: z.int(),
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		let filterIds = [...(input.filterIds || []), ctx.auth.accountId as UsersId];
		const cursor = input.cursor || 0;
		const options = input.options || { type: "all" };
		if (options.type === "not-connected-receipt") {
			const { receiptId } = options;
			const receipt = await database
				.selectFrom("receipts")
				.select(["id", "ownerAccountId"])
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
			const userParticipants = await database
				.selectFrom("receiptParticipants")
				.innerJoin("users", (jb) =>
					jb.onRef("users.id", "=", "receiptParticipants.userId"),
				)
				.where("receiptParticipants.receiptId", "=", options.receiptId)
				.select("users.id")
				.execute();
			filterIds = [
				...new Set([...filterIds, ...userParticipants.map(({ id }) => id)]),
			];
		}
		const fuzzyMathedUsers = await database
			.selectFrom("users")
			.$if(filterIds.length !== 0, (qb) =>
				qb.where("users.id", "not in", filterIds),
			)
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.$if(Boolean(options.type === "not-connected"), (qb) =>
				qb.where("users.connectedAccountId", "is", null),
			)
			.$if(input.input.length < 3, (qb) =>
				qb.where("name", "ilike", `%${input.input}%`),
			)
			.$if(input.input.length >= 3, (qb) =>
				qb.where(
					sql`strict_word_similarity(${input.input}, name)`.$castTo<number>(),
					">=",
					SIMILARTY_THRESHOLD,
				),
			)
			.select(["users.id"])
			.$if(input.input.length < 3, (qb) => qb.orderBy("name"))
			.$if(input.input.length >= 3, (qb) =>
				qb.orderBy(
					sql`strict_word_similarity(${input.input}, name)`.$castTo(),
					"desc",
				),
			)
			// Stable order for users with the same name
			.orderBy("users.id")
			.offset(cursor)
			.limit(input.limit + 1)
			.execute();
		const mappedUserIds = fuzzyMathedUsers.map(({ id }) => id);
		return {
			cursor,
			hasMore: mappedUserIds.length === input.limit + 1,
			items: mappedUserIds.slice(0, input.limit),
		};
	});
