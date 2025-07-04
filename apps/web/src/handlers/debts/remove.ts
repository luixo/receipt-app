import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

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
			.where((eb) =>
				eb.and({
					"debts.id": input.id,
					"debts.ownerAccountId": ctx.auth.accountId,
				}),
			)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.onRef("users.ownerAccountId", "=", "debts.ownerAccountId"),
			)
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.select(["accountSettings.manualAcceptDebts"])
			.limit(1)
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No debt found by id "${input.id}" on account "${ctx.auth.email}"`,
			});
		}
		const reverseRemoved = !debt.manualAcceptDebts;
		const deleteResult = await database
			.deleteFrom("debts")
			.where("id", "=", input.id)
			.$if(!reverseRemoved, (qb) =>
				qb.where("ownerAccountId", "=", ctx.auth.accountId),
			)
			.executeTakeFirst();
		return { reverseRemoved: Number(deleteResult.numDeletedRows) > 1 };
	});
