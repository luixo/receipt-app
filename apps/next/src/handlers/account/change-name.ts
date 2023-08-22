import * as trpc from "@trpc/server";
import { z } from "zod";

import { userNameSchema } from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure
	.input(
		z.strictObject({
			name: userNameSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			// Typesystem doesn't know that we use account id as self user id
			.where("users.id", "=", ctx.auth.accountId as UsersId)
			.select("users.name")
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Your account doesn't have a user for yourself",
			});
		}
		await database
			.updateTable("users")
			.set({ name: input.name })
			.where("id", "=", ctx.auth.accountId as UsersId)
			.executeTakeFirst();
	});
