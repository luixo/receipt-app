import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { ACCOUNT_CONNECTIONS_INTENTIONS } from "next-app/db/consts";
import { UsersId } from "next-app/db/models";
import { getAccountByEmail } from "next-app/handlers/account/utils";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		userId: z.string().uuid().refine<UsersId>(flavored),
		email: z.string().email(),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.userId, [
			"id",
			"name",
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
		const account = await getAccountByEmail(database, input.email, ["id"]);
		if (!account) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Account with email ${input.email} does not exist.`,
			});
		}
		const viceVersaIntention = await database
			.selectFrom("accountConnectionsIntentions")
			.select("userId")
			.where("accountId", "=", account.id)
			.where("targetAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (viceVersaIntention) {
			await database.transaction().execute(async (tx) => {
				await tx
					.updateTable("users")
					.set({ connectedAccountId: ctx.auth.accountId })
					.where("ownerAccountId", "=", account.id)
					.where("id", "=", viceVersaIntention.userId)
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
			return {
				id: account.id,
				userName: user.name,
				connected: true,
			};
		}
		try {
			await database
				.insertInto("accountConnectionsIntentions")
				.values({
					accountId: ctx.auth.accountId,
					targetAccountId: account.id,
					userId: input.userId,
					created: new Date(),
				})
				.executeTakeFirst();
			return {
				id: account.id,
				userName: user.name,
				connected: false,
			};
		} catch (e) {
			// Could be like `duplicate key value violates unique constraint "..."`
			const message = String(e);
			if (
				message.includes(
					ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.ACCOUNT_PAIR
				)
			) {
				const existingIntention = await database
					.selectFrom("accountConnectionsIntentions")
					.where("accountId", "=", ctx.auth.accountId)
					.where("targetAccountId", "=", account.id)
					.select(["userId"])
					.executeTakeFirstOrThrow();
				const existingUser = await getUserById(
					database,
					existingIntention.userId,
					["name"]
				);
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `You already has intention to connect to ${
						input.email
					} as user ${existingUser!.name}.`,
				});
			}
			if (
				message.includes(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.USER_PAIR)
			) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `You already has intention to connect to user ${user.name}.`,
				});
			}
			throw e;
		}
	},
});
