import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

import { getUserById } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		id: z.string().uuid().refine<UsersId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.id, ["ownerAccountId"]);
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
		await database
			.deleteFrom("users")
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
