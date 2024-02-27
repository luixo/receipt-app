import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select("ownerAccountId")
			.where("id", "=", input.id)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.id}" is not owned by "${ctx.auth.email}".`,
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
