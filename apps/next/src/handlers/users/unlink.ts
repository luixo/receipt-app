import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { getUserById } from "next-app/handlers/users/utils";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("unlink", {
	input: z.strictObject({
		id: z.string().uuid().refine<UsersId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.id, [
			"ownerAccountId",
			"connectedAccountId",
		]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No user found by id ${input.id}`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `User ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}
		if (!user.connectedAccountId) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `User ${input.id} doesn't have account connected to it`,
			});
		}
		await database
			.updateTable("users")
			.set({ connectedAccountId: null })
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
