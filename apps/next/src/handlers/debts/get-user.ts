import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { userIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get-user", {
	input: z.strictObject({
		userId: userIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users")
			.where("users.id", "=", input.userId)
			.select("users.ownerAccountId")
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}

		const debts = await database
			.selectFrom("debts")
			.where("debts.userId", "=", input.userId)
			.select(["id", "currency", "amount", "timestamp", "created", "note"])
			.orderBy("timestamp", "desc")
			.orderBy("id")
			.execute();

		return debts.map((debt) => ({
			...debt,
			amount: Number(debt.amount),
		}));
	},
});
