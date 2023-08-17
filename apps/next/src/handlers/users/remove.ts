import * as trpc from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await getUserById(database, input.id, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No user found by id ${input.id}`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `User ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}
		await database.transaction().execute(async (tx) => {
			const receipts = await tx
				.selectFrom("receipts")
				.innerJoin(
					"receiptParticipants",
					"receiptParticipants.receiptId",
					"receipts.id",
				)
				.where("receiptParticipants.userId", "=", input.id)
				.select("id")
				.execute();
			if (receipts.length !== 0) {
				await tx
					.updateTable("receipts")
					.where(
						"id",
						"in",
						receipts.map(({ id }) => id),
					)
					.set({
						lockedTimestamp: null,
					})
					.execute();
			}
			await tx
				.deleteFrom("users")
				.where("id", "=", input.id)
				.executeTakeFirst();
		});
	});
