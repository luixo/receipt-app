import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

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
			.selectFrom("users as usersMine")
			.where("usersMine.id", "=", input.id)
			.leftJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "usersMine.connectedAccountId"),
			)
			.leftJoin("users as usersTheir", (qb) =>
				qb
					.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId)
					.onRef("usersTheir.ownerAccountId", "=", "accounts.id"),
			)
			.select([
				"usersMine.ownerAccountId",
				"accounts.id as connectedAccountId",
				"usersTheir.id as theirUserId",
			])
			.limit(1)
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
		const { connectedAccountId } = user;
		if (!connectedAccountId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.id}" doesn't have account connected to it.`,
			});
		}
		/* c8 ignore start */
		if (!user.theirUserId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `User "${input.id}" doesn't have a counterparty to unlink from.`,
			});
		}
		/* c8 ignore stop */
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: null })
				.where("id", "=", input.id)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: null })
				.where("id", "=", user.theirUserId)
				.executeTakeFirst();
		});
	});
