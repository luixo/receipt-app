import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { userIdSchema } from "next-app/handlers/validation";

export const router = trpc
	.router<AuthorizedContext>()
	.mutation("cancel-request", {
		input: z.strictObject({
			userId: userIdSchema,
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
			const intention = await database
				.selectFrom("accountConnectionsIntentions")
				.select("userId")
				.where("accountId", "=", ctx.auth.accountId)
				.where("userId", "=", input.userId)
				.executeTakeFirst();
			if (!intention) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Intention for user id ${input.userId} not found.`,
				});
			}
			await database
				.deleteFrom("accountConnectionsIntentions")
				.where("accountId", "=", ctx.auth.accountId)
				.where("userId", "=", input.userId)
				.execute();
		},
	});
