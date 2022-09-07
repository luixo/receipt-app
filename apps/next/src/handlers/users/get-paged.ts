import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import { limitSchema, offsetSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const accountUsers = database
			.selectFrom("users")
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			// Typesystem doesn't know that we use account id as self user id
			.where("users.id", "<>", ctx.auth.accountId as UsersId);
		const [users, usersCount] = await Promise.all([
			accountUsers
				.leftJoin("accounts", (qb) =>
					qb.onRef("connectedAccountId", "=", "accounts.id")
				)
				.select(["users.id", "name", "publicName", "accounts.email"])
				.orderBy("name")
				.offset(input.cursor)
				.limit(input.limit + 1)
				.execute(),
			accountUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirst(),
		]);

		return {
			count: usersCount ? parseInt(usersCount.amount, 10) : 0,
			cursor: input.cursor,
			hasMore: users.length === input.limit + 1,
			items: users.slice(0, input.limit),
		};
	});
