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
				message: `No user found by id "${input.id}".`,
			});
		}
		const { ownerAccountId, publicName, email, ...user } = maybeUser;
		if (ownerAccountId === ctx.auth.accountId) {
			return {
				...user,
				publicName: publicName === null ? undefined : publicName,
				email: email === null ? undefined : email,
				localId: user.remoteId as UsersId | null,
			};
		}
		// We allow account fetch foreign users
		// In case they share the same receipt
		const userResult = await database
			.selectFrom("users as usersThem")
			.where("usersThem.id", "=", input.id)
			.innerJoin("receiptParticipants as receiptParticipantsThem", (qb) =>
				qb.onRef("receiptParticipantsThem.userId", "=", "usersThem.id"),
			)
			.innerJoin("receiptParticipants as receiptParticipantsMe", (qb) =>
				qb.onRef(
					"receiptParticipantsMe.receiptId",
					"=",
					"receiptParticipantsThem.receiptId",
				),
			)
			// Only allow for receipts in which the fetching account is included
			.innerJoin("users as usersMe", (qb) =>
				qb
					.onRef("receiptParticipantsMe.userId", "=", "usersMe.id")
					.onRef("usersMe.ownerAccountId", "=", "usersThem.ownerAccountId")
					.on("usersMe.connectedAccountId", "=", ctx.auth.accountId),
			)
			.leftJoin("accounts", (qb) =>
				qb.onRef("usersThem.connectedAccountId", "=", "accounts.id"),
			)
			.leftJoin("users as usersMine", (qb) =>
				qb
					.onRef("usersMine.connectedAccountId", "=", "accounts.id")
					.onRef("usersMine.ownerAccountId", "=", "usersMe.connectedAccountId"),
			)
			.select([
				"usersMine.id as mineId",
				"usersMine.name",
				"usersMine.publicName",
				"accounts.email",
				"accounts.id as accountId",
				"usersThem.name as theirName",
				"usersThem.publicName as theirPublicName",
			])
			.groupBy([
				"usersMine.id",
				"usersMine.name",
				"usersMine.publicName",
				"accounts.email",
				"accounts.id",
				"usersThem.name",
				"usersThem.publicName",
			])
			.executeTakeFirst();
		if (!userResult) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (userResult.mineId) {
			return {
				accountId: userResult.accountId!,
				email: userResult.email!,
				name: userResult.name!,
				publicName:
					userResult.publicName === null ? undefined : userResult.publicName,
				remoteId: input.id,
				localId: userResult.mineId,
			};
		}
		return {
			accountId: userResult.accountId,
			email: userResult.email === null ? undefined : userResult.email,
			name: userResult.theirPublicName || userResult.theirName,
			publicName:
				userResult.theirPublicName === null
					? undefined
					: userResult.theirPublicName,
			remoteId: input.id,
			localId: null as UsersId | null,
		};
	});
