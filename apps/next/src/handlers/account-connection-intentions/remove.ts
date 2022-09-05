import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { removeIntention } from "next-app/handlers/account-connection-intentions/utils";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { accountIdSchema, userIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("remove", {
	input: z.discriminatedUnion("type", [
		z.strictObject({
			type: z.literal("targetAccountId"),
			targetAccountId: accountIdSchema,
		}),
		z.strictObject({
			type: z.literal("userId"),
			userId: userIdSchema,
		}),
	]),
	resolve: async ({ ctx, input }) => {
		const database = getDatabase(ctx);
		switch (input.type) {
			case "targetAccountId": {
				const intention = await database
					.selectFrom("accountConnectionsIntentions")
					.select(["accountId", "targetAccountId"])
					.where("accountId", "=", ctx.auth.accountId)
					.where("targetAccountId", "=", input.targetAccountId)
					.executeTakeFirst();
				return removeIntention(
					database,
					intention,
					`for account id ${input.targetAccountId}`
				);
			}
			case "userId": {
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
				const intention = await database
					.selectFrom("accountConnectionsIntentions")
					.select(["accountId", "targetAccountId"])
					.where("accountId", "=", ctx.auth.accountId)
					.where("userId", "=", input.userId)
					.executeTakeFirst();
				return removeIntention(
					database,
					intention,
					`for user id ${input.userId}`
				);
			}
		}
	},
});
