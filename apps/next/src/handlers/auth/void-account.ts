import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { unauthProcedure } from "next-app/handlers/trpc";
import { confirmEmailTokenSchema } from "next-app/handlers/validation";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: confirmEmailTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.executeTakeFirst();
		if (!account) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `There is no account with confirmation token ${input.token}`,
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
