import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users as usersMine")
			.where("id", "=", input.id)
			.innerJoin("accounts", (qb) =>
				qb.on("accounts.id", "=", "usersMine.connectedAccountId")
			)
			.innerJoin("users as usersTheir", (qb) =>
				qb
					.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId)
					.onRef("usersTheir.ownerAccountId", "=", "accounts.id")
			)
			.select([
				"usersMine.ownerAccountId",
				"usersMine.connectedAccountId",
				"usersTheir.id as theirUserId",
			])
			.executeTakeFirst();
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
		if (!user.connectedAccountId) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `User ${input.id} doesn't have account connected to it`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: null })
				.where("id", "=", input.id)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: null })
				.where("id", "=", user.theirUserId!)
				.executeTakeFirst();
		});
	});
