import * as trpc from "@trpc/server";
import { z } from "zod";

import { AuthorizedContext } from "../context";
import { getDatabase } from "../../db";
import { TRPCError } from "@trpc/server";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.undefined(),
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.innerJoin("users", (jb) =>
				jb.onRef("users.ownerAccountId", "=", "accounts.id")
			)
			.select(["accounts.id", "users.name"])
			.where("accounts.id", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Account ${ctx.auth.accountId} is not found`,
			});
		}
		return account;
	},
});
