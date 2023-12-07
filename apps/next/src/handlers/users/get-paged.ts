import { z } from "zod";

import type { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import { limitSchema, offsetSchema } from "next-app/handlers/validation";

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
				.leftJoin("accounts", (qb) =>
					qb.onRef("connectedAccountId", "=", "accounts.id"),
				)
				.select(["users.id", "name", "publicName", "accounts.email"])
				// Stable order for users with the same name
				.orderBy(["users.name", "users.id"])
				.offset(input.cursor)
				.limit(input.limit + 1)
				.execute(),
			accountUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(usersCount.amount, 10),
			cursor: input.cursor,
			hasMore: users.length === input.limit + 1,
			items: users
				.slice(0, input.limit)
				.map(({ publicName, email, ...user }) => ({
					...user,
					publicName: publicName === null ? undefined : publicName,
					email: email == null ? undefined : email,
				})),
		};
	});
