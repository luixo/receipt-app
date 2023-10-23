import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const debt = await database
			.selectFrom("debts")
			.where("debts.id", "=", input.id)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.onRef("users.ownerAccountId", "=", "debts.ownerAccountId"),
			)
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.leftJoin("debts as theirDebts", (qb) =>
				qb
					.onRef("theirDebts.id", "=", "debts.id")
					.onRef("theirDebts.ownerAccountId", "<>", "debts.ownerAccountId"),
			)
			.select(["accountSettings.autoAcceptDebts"])
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No debt found by id "${input.id}" on account "${ctx.auth.email}"`,
			});
		}
		const reverseRemoved = Boolean(debt.autoAcceptDebts);
		await database
			.deleteFrom("debts")
			.where("id", "=", input.id)
			.$if(!reverseRemoved, (qb) =>
				qb.where("ownerAccountId", "=", ctx.auth.accountId),
			)
			.executeTakeFirst();
		return { reverseRemoved };
	});
