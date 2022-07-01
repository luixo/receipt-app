import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().query("get-paged", {
	input: z.strictObject({
		cursor: z.number().nullish(),
		limit: z.number(),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const users = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id")
			)
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.select(["users.id", "name", "publicName", "accounts.email"])
			.orderBy("name")
			.offset(input.cursor || 0)
			.limit(input.limit)
			.execute();

		return users.map((user) => ({
			...user,
			dirty: undefined as boolean | undefined,
		}));
	},
});
