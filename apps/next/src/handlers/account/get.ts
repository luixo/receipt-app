import * as trpc from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().query("get", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.innerJoin("users", (jb) =>
				jb.onRef("users.ownerAccountId", "=", "accounts.id")
			)
			.select(["accounts.id", "users.name", "users.publicName"])
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
