import * as trpc from "@trpc/server";
import { z } from "zod";

import type { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const maybeUser = await database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("connectedAccountId", "=", "accounts.id"),
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
			const ids = await database
				.selectFrom("users as usersThem")
				.where("usersThem.id", "=", input.id)
				.innerJoin("receiptParticipants as receiptParticipantsThem", (qb) =>
					qb.onRef("receiptParticipantsThem.userId", "=", "usersThem.id"),
				)
				.innerJoin("receipts", (qb) =>
					qb.onRef("receiptParticipantsThem.receiptId", "=", "receipts.id"),
				)
				.innerJoin("receiptParticipants as receiptParticipantsMe", (qb) =>
					qb.onRef("receiptParticipantsMe.receiptId", "=", "receipts.id"),
				)
				.innerJoin("users as usersMe", (qb) =>
					qb
						.onRef("receiptParticipantsMe.userId", "=", "usersMe.id")
						.on("usersMe.connectedAccountId", "=", ctx.auth.accountId),
				)
				.leftJoin("accounts", (qb) =>
					qb.onRef("usersThem.connectedAccountId", "=", "accounts.id"),
				)
				.leftJoin("users as usersMine", (qb) =>
					qb.onRef("usersMine.connectedAccountId", "=", "accounts.id"),
				)
				.select(["usersMine.id as mineId", "usersMe.id as meId"])
				.groupBy(["usersMine.id", "usersMe.id"])
				.executeTakeFirst();
			if (ids) {
				if (ids.mineId) {
					const myUser = await database
						.selectFrom("users")
						.leftJoin("accounts", (qb) =>
							qb.onRef("connectedAccountId", "=", "accounts.id"),
						)
						.where("users.id", "=", ids.mineId)
						.select([
							"users.id as remoteId",
							"name",
							"publicName",
							"accounts.email",
							"accounts.id as accountId",
						])
						.limit(1)
						.executeTakeFirstOrThrow();
					return {
						...myUser,
						localId: user.remoteId as UsersId | null,
					};
				}
				const theirUser = await database
					.selectFrom("users")
					.leftJoin("accounts", (qb) =>
						qb.onRef("connectedAccountId", "=", "accounts.id"),
					)
					.where("users.id", "=", input.id)
					.select([
						"users.id as remoteId",
						"users.publicName",
						"users.name",
						"accounts.email",
						"accounts.id as accountId",
					])
					.executeTakeFirstOrThrow();
				return {
					...theirUser,
					name: theirUser.publicName || theirUser.name,
					publicName: theirUser.publicName,
					localId: null as UsersId | null,
				};
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
