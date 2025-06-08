import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select("ownerAccountId")
			.where("id", "=", input.id)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		await database
			.deleteFrom("users")
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
