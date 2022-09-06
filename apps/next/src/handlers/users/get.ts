import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: userIdSchema,
			viaReceiptId: receiptIdSchema.optional(),
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const maybeUser = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id")
			)
			.where("users.id", "=", input.id)
			.select([
				"users.id as remoteId",
				"name",
				"publicName",
				"ownerAccountId",
				"accounts.email",
				"accounts.id as accountId",
			])
			.limit(1)
			.executeTakeFirst();
		if (!maybeUser) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.id} does not exist.`,
			});
		}
		const { ownerAccountId, ...user } = maybeUser;
		if (ownerAccountId !== ctx.auth.accountId) {
			const errorMessage = `User ${input.id} is not owned by ${ctx.auth.accountId}`;
			// We allow account fetch foreign users
			// In case they share the same receipt
			if (input.viaReceiptId) {
				const check = await database
					.selectFrom("receipts")
					.where("receipts.id", "=", input.viaReceiptId)
					.innerJoin("receiptParticipants", (qb) =>
						qb.onRef("receiptParticipants.receiptId", "=", "receipts.id")
					)
					.innerJoin("users", (qb) =>
						qb
							.onRef("receiptParticipants.userId", "=", "users.id")
							.on((innerQb) =>
								innerQb
									.on("users.connectedAccountId", "=", ctx.auth.accountId)
									.orOn("users.id", "=", input.id)
							)
					)
					.select(["receiptParticipants.userId"])
					.execute();
				if (
					check.length === 2 &&
					check.some((participant) => participant.userId === input.id)
				) {
					const localUser = await database
						.selectFrom("users as usersTheir")
						.leftJoin("accounts", (qb) =>
							qb.onRef("connectedAccountId", "=", "accounts.id")
						)
						.leftJoin("users as usersMine", (jb) =>
							jb
								.onRef(
									"usersMine.connectedAccountId",
									"=",
									"usersTheir.connectedAccountId"
								)
								.on("usersMine.ownerAccountId", "=", ctx.auth.accountId)
						)
						.where("usersTheir.id", "=", input.id)
						.select([
							"usersTheir.id as remoteId",
							"usersMine.id as localId",
							sql<string>`case
								when "usersMine".name is not null
									then "usersMine".name
								when "usersTheir"."publicName" is not null
									then "usersTheir"."publicName"
								else
									"usersTheir".name
								end`.as("name"),
							sql<string>`case
								when "usersMine"."publicName" is not null
									then "usersMine"."publicName"
								when "usersMine".name is not null
									then null
								when "usersTheir"."publicName" = "usersTheir".name
									then null
								else
									"usersTheir"."publicName"
								end`.as("publicName"),
							"accounts.email",
							"accounts.id as accountId",
						])
						.limit(1)
						.executeTakeFirstOrThrow();
					return localUser;
				}

				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `${errorMessage} and doesn't share receipt ${input.viaReceiptId} with him`,
				});
			}
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: errorMessage,
			});
		}
		return {
			...user,
			localId: user.remoteId as UsersId | null,
		};
	});
