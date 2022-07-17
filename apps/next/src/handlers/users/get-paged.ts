import * as trpc from "@trpc/server";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().query("get-paged", {
	input: z.strictObject({
		cursor: z
			.string()
			.min(VALIDATIONS_CONSTANTS.userName.min)
			.max(VALIDATIONS_CONSTANTS.userName.max)
			.nullish(),
		limit: z.number(),
	}),
	resolve: async ({ input, ctx }) => {
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
				.if(Boolean(input.cursor), (qb) => qb.where("name", ">", input.cursor!))
				.limit(input.limit + 1)
				.execute(),
			accountUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(usersCount.amount, 10),
			hasMore: users.length === input.limit + 1,
			items: (
				users as (typeof users[number] & { dirty: boolean | undefined })[]
			).slice(0, input.limit),
		};
	},
});
