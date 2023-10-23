import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { addConnectionIntention } from "next-app/handlers/account-connection-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { emailSchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
			email: emailSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await ctx.database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "users.connectedAccountId"),
			)
			.select([
				"users.id",
				"users.name",
				"accounts.email",
				"users.ownerAccountId",
			])
			.where("users.id", "=", input.userId)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (user.email) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" is already connected to account "${user.email}".`,
			});
		}
		return addConnectionIntention(
			database,
			ctx.auth.accountId,
			user,
			input.email,
			input.userId,
		);
	});
