import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			accountId: accountIdSchema,
			userId: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await ctx.database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accounts.id"),
			)
			.select(["users.id", "accounts.email", "users.ownerAccountId"])
			.where("users.id", "=", input.userId)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (user.email) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" is already connected to an account with email "${user.email}".`,
			});
		}
		const account = await database
			.selectFrom("accounts")
			.select(["id", "email", "avatarUrl"])
			.where("id", "=", input.accountId)
			.limit(1)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Account with id "${input.accountId}" does not exist.`,
			});
		}
		const intention = await database
			.selectFrom("accountConnectionsIntentions")
			.select("userId")
			.where((eb) =>
				eb.and({ accountId: account.id, targetAccountId: ctx.auth.accountId }),
			)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account "${account.email}" not found.`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: ctx.auth.accountId })
				.where((eb) =>
					eb.and({ ownerAccountId: account.id, id: intention.userId }),
				)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: account.id })
				.where((eb) =>
					eb.and({ ownerAccountId: ctx.auth.accountId, id: input.userId }),
				)
				.executeTakeFirst();
			await tx
				.deleteFrom("accountConnectionsIntentions")
				.where((eb) =>
					eb.and({
						accountId: account.id,
						targetAccountId: ctx.auth.accountId,
					}),
				)
				.executeTakeFirst();
		});
		return {
			email: account.email,
			id: account.id,
			avatarUrl: account.avatarUrl || undefined,
		};
	});
