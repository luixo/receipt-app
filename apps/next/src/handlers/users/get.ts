import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		id: z.string().uuid().refine<UsersId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id")
			)
			.where("users.id", "=", input.id)
			.select([
				"users.id",
				"name",
				"publicName",
				"ownerAccountId",
				"accounts.email",
			])
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.id} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.id} is not owned by ${ctx.auth.accountId}.`,
			});
		}
		return user as typeof user & { dirty?: boolean };
	},
});
