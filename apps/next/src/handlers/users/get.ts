import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AccountsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		accountId: z.string().uuid().refine<AccountsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users")
			.where("connectedAccountId", "=", input.accountId)
			.where("ownerAccountId", "=", ctx.auth.accountId)
			.select(["id", "name"])
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User by account id ${input.accountId} does not exist.`,
			});
		}
		return user;
	},
});
