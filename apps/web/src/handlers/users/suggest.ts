import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import {
	MAX_SUGGEST_LENGTH,
	directionSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import type { UsersId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema, userIdSchema } from "~web/handlers/validation";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const SIMILARTY_THRESHOLD = 0.33;

const inputSchema = z.strictObject({
	input: z.string().max(MAX_SUGGEST_LENGTH),
	cursor: offsetSchema,
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
	direction: directionSchema,
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<UsersId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	let filterIds = [...(input.filterIds || []), auth.accountId as UsersId];
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
		const accessRole = await getAccessRole(database, receipt, auth.accountId);
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
	const fuzzyMatchedUsersExpression = database
		.selectFrom("users")
		.$if(filterIds.length !== 0, (qb) =>
			qb.where("users.id", "not in", filterIds),
		)
		.where("users.ownerAccountId", "=", auth.accountId)
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
		);
	const [fuzzyMatchedUsers, totalCountUsers] = await Promise.all([
		fuzzyMatchedUsersExpression
			.$if(input.input.length < 3, (qb) => qb.orderBy("name"))
			.$if(input.input.length >= 3, (qb) =>
				qb.orderBy(
					sql`word_similarity(${input.input}, name)`.$castTo(),
					"desc",
				),
			)
			.select(["users.id"])
			// Stable order for users with the same name
			.orderBy("users.id")
			.offset(cursor)
			.limit(input.limit)
			.execute(),
		fuzzyMatchedUsersExpression
			.select([(eb) => eb.fn.count<string>("users.id").as("count")])
			.executeTakeFirstOrThrow(),
	]);
	return {
		count: parseInt(totalCountUsers.count, 10),
		cursor,
		items: fuzzyMatchedUsers.map(({ id }) => id),
	};
};

const queueSuggestUserList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, UsersId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure
	.input(inputSchema)
	.query(queueSuggestUserList);
