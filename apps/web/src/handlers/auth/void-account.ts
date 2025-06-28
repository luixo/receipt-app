import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { voidAccountTokenSchema } from "~app/utils/validation";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: voidAccountTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.limit(1)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `There is no account with confirmation token "${input.token}".`,
			});
		}
		await database
			.deleteFrom("accounts")
			.where("accounts.id", "=", account.id)
			.executeTakeFirst();
		return {
			email: account.email,
		};
	});
