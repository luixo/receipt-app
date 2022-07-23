import * as trpc from "@trpc/server";
import { z } from "zod";

import { userNameSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { limitSchema } from "next-app/handlers/validation";

export const router = trpc
	.router<AuthorizedContext>()
	.query("get-not-connected", {
		input: z.strictObject({
			cursor: userNameSchema.optional(),
			limit: limitSchema,
		}),
		resolve: async ({ input, ctx }) => {
			const database = getDatabase(ctx);
			const accountUsers = database
				.selectFrom("users")
				.where("users.ownerAccountId", "=", ctx.auth.accountId)
				.where("users.connectedAccountId", "is", null);
			const [users, usersCount] = await Promise.all([
				accountUsers
					.select(["users.id", "name"])
					.orderBy("name")
					.if(Boolean(input.cursor), (qb) =>
						qb.where("name", ">", input.cursor!)
					)
					.limit(input.limit + 1)
					.execute(),
				accountUsers
					.select(database.fn.count<string>("id").as("amount"))
					.executeTakeFirstOrThrow(),
			]);

			return {
				count: parseInt(usersCount.amount, 10),
				hasMore: users.length === input.limit + 1,
				items: users.slice(0, input.limit),
			};
		},
	});
