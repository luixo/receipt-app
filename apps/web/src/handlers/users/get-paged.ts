import { z } from "zod/v4";

import type { UsersId } from "~db/models";
import { authProcedure } from "~web/handlers/trpc";
import { limitSchema, offsetSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const accountUsers = database.selectFrom("users").where((eb) =>
			eb("users.ownerAccountId", "=", ctx.auth.accountId).and(
				"users.id",
				"<>",
				// Typesystem doesn't know that we use account id as self user id;
				ctx.auth.accountId as UsersId,
			),
		);
		const [users, usersCount] = await Promise.all([
			accountUsers
				.select("users.id")
				// Stable order for users with the same name
				.orderBy(["users.name", "users.id"])
				.offset(input.cursor)
				.limit(input.limit)
				.execute(),
			accountUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(usersCount.amount, 10),
			cursor: input.cursor,
			items: users.map(({ id }) => id),
		};
	});
