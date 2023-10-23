import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { unauthProcedure } from "next-app/handlers/trpc";
import { confirmEmailTokenSchema } from "next-app/handlers/validation";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: confirmEmailTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `There is no account with confirmation token "${input.token}".`,
			});
		}
		await database
			.updateTable("accounts")
			.set({ confirmationToken: null, confirmationTokenTimestamp: null })
			.where("accounts.id", "=", account.id)
			.executeTakeFirst();
		return {
			email: account.email,
		};
	});
