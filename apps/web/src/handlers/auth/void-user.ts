import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { voidUserTokenSchema } from "~app/utils/validation";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Void user",
		description:
			"Permanently deletes an unconfirmed user identified by its confirmation token.",
	})
	.input(
		z.strictObject({
			token: voidUserTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `There is no user with confirmation token "${input.token}".`,
			});
		}
		await database
			.deleteFrom("users")
			.where("users.id", "=", user.id)
			.executeTakeFirst();
		return {
			email: user.email,
		};
	});
