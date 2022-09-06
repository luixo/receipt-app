import * as trpc from "@trpc/server";
import { z } from "zod";

import { emailSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { addConnectionIntention } from "next-app/handlers/account-connection-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
			email: emailSchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
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
		return addConnectionIntention(
			database,
			ctx.auth.accountId,
			user,
			input.email,
			input.userId
		);
	});
