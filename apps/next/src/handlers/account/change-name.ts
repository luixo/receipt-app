import { z } from "zod";

import { userNameSchema } from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure
	.input(z.strictObject({ name: userNameSchema }))
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		await database
			.updateTable("users")
			.set({ name: input.name })
			.where("id", "=", ctx.auth.accountId as UsersId)
			.executeTakeFirst();
	});
