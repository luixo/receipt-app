import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await getUserById(database, input.id, [
			"name",
			"ownerAccountId",
		]);
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
		return user.name;
	});
