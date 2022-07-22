import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { accountIdSchema, userIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
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
		let intention;
		switch (input.type) {
			case "targetAccountId": {
				intention = await database
					.selectFrom("accountConnectionsIntentions")
					.select("targetAccountId")
					.where("accountId", "=", ctx.auth.accountId)
					.where("targetAccountId", "=", input.targetAccountId)
					.executeTakeFirst();
				break;
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
				intention = await database
					.selectFrom("accountConnectionsIntentions")
					.select("targetAccountId")
					.where("accountId", "=", ctx.auth.accountId)
					.where("userId", "=", input.userId)
					.executeTakeFirst();
			}
		}
		if (!intention) {
			const intentionType =
				input.type === "targetAccountId"
					? `for account id ${input.targetAccountId}`
					: `for user id ${input.userId}`;
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention ${intentionType} does not exist.`,
			});
		}
		await database
			.deleteFrom("accountConnectionsIntentions")
			.where("accountId", "=", ctx.auth.accountId)
			.where("targetAccountId", "=", intention.targetAccountId)
			.execute();
	},
});
