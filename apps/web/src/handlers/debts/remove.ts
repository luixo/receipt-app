import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove debt",
		description:
			"Removes a debt owned by the current  user, and the counterparty's mirrored debt unless they require manual acceptance.",
	})
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
					"debts.ownerUserId": ctx.auth.userId,
				}),
			)
			.innerJoin("peers", (qb) =>
				qb
					.onRef("peers.id", "=", "debts.peerId")
					.onRef("peers.ownerUserId", "=", "debts.ownerUserId"),
			)
			.leftJoin("userSettings", (qb) =>
				qb.onRef("peers.connectedUserId", "=", "userSettings.userId"),
			)
			.select(["userSettings.manualAcceptDebts"])
			.limit(1)
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No debt found by id "${input.id}" on  user "${ctx.auth.email}"`,
			});
		}
		const reverseRemoved = !debt.manualAcceptDebts;
		const deleteResult = await database
			.deleteFrom("debts")
			.where("id", "=", input.id)
			.$if(!reverseRemoved, (qb) =>
				qb.where("ownerUserId", "=", ctx.auth.userId),
			)
			.executeTakeFirst();
		return { reverseRemoved: Number(deleteResult.numDeletedRows) > 1 };
	});
