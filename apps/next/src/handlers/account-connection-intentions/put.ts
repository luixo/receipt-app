import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { UsersId } from "../../db/models";
import { getAccountByEmail } from "../account/utils";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";
import { getUserById } from "../users/utils";

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
				message.includes("accountConnectionsIntentions:accounts:accountPair")
			) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `Account with email ${input.email} already has intention to connect with ${ctx.auth.accountId}.`,
				});
			}
			if (message.includes("accountConnectionsIntentions:accounts:userPair")) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `User id ${input.userId} already has intention to connect with ${ctx.auth.accountId}.`,
				});
			}
			throw e;
		}
	},
});
