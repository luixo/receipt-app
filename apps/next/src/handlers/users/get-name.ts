import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select(["name", "ownerAccountId"])
			.where("id", "=", input.id)
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
		return user.name;
	});
