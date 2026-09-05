import { z } from "zod";

import { userNameSchema } from "~app/utils/validation";
import type { UserId } from "~db/ids";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Change account name",
		description: "Updates the display name of the current account's self-user.",
	})
	.input(z.strictObject({ name: userNameSchema }))
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		await database
			.updateTable("users")
			.set({ name: input.name })
			.where("id", "=", ctx.auth.accountId as UserId)
			.executeTakeFirst();
	});
