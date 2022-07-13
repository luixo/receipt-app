import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AccountsId, UsersId } from "next-app/db/models";
import { getAccountById } from "next-app/handlers/account/utils";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("accept", {
	input: z.strictObject({
		accountId: z.string().uuid().refine<AccountsId>(flavored),
		userId: z.string().uuid().refine<UsersId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.userId, [
			"id",
			"connectedAccountId",
			"ownerAccountId",
		]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}
		if (user.connectedAccountId) {
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `User ${input.userId} is already connected to an account.`,
			});
		}
		const account = await getAccountById(database, input.accountId, [
			"id",
			"email",
		]);
		if (!account) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Account with id ${input.accountId} does not exist.`,
			});
		}
		const intention = await database
			.selectFrom("accountConnectionsIntentions")
			.select("userId")
			.where("accountId", "=", account.id)
			.where("targetAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (!intention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account id ${input.accountId} not found.`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: ctx.auth.accountId })
				.where("ownerAccountId", "=", account.id)
				.where("id", "=", intention.userId)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: account.id })
				.where("ownerAccountId", "=", ctx.auth.accountId)
				.where("id", "=", input.userId)
				.executeTakeFirst();
			await tx
				.deleteFrom("accountConnectionsIntentions")
				.where("accountId", "=", account.id)
				.where("targetAccountId", "=", ctx.auth.accountId)
				.executeTakeFirst();
		});
		return account.email;
	},
});
