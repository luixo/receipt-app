import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

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
		return {
			...user,
			dirty: undefined as boolean | undefined,
		};
	},
});
