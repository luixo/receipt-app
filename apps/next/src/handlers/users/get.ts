import { TRPCError } from "@trpc/server";
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
				"accounts.avatarUrl",
				"accounts.email",
				"accounts.id as accountId",
			])
			.limit(1)
			.executeTakeFirst();
		if (!maybeUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		const { ownerAccountId, publicName, email, accountId, avatarUrl, ...user } =
			maybeUser;
		if (ownerAccountId === ctx.auth.accountId) {
			return {
				...user,
				publicName: publicName === null ? undefined : publicName,
				localId: user.remoteId as UsersId | null,
				connectedAccount:
					email === null || accountId === null
						? undefined
						: { id: accountId, email, avatarUrl: avatarUrl || undefined },
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
				"accounts.avatarUrl",
				"usersThem.name as theirName",
				"usersThem.publicName as theirPublicName",
			])
			.groupBy([
				"usersMine.id",
				"usersMine.name",
				"usersMine.publicName",
				"accounts.email",
				"accounts.id",
				"accounts.avatarUrl",
				"usersThem.name",
				"usersThem.publicName",
			])
			.executeTakeFirst();
		if (!userResult) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (userResult.mineId) {
			/* c8 ignore start */
			if (!userResult.accountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected not having accountId on a user result: ${userResult.accountId}.`,
				});
			}
			if (!userResult.email) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected not having email on a user result: ${userResult.email}.`,
				});
			} /* c8 ignore start */
			if (!userResult.name) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected not having name on a user result: ${userResult.name}`,
				});
			}
			/* c8 ignore stop */
			return {
				name: userResult.name,
				publicName:
					userResult.publicName === null ? undefined : userResult.publicName,
				remoteId: input.id,
				connectedAccount: {
					id: userResult.accountId,
					email: userResult.email,
					avatarUrl: userResult.avatarUrl || undefined,
				},
				localId: userResult.mineId,
			};
		}
		return {
			name: userResult.theirPublicName || userResult.theirName,
			publicName:
				userResult.theirPublicName === null
					? undefined
					: userResult.theirPublicName,
			remoteId: input.id,
			connectedAccount: undefined,
			localId: null as UsersId | null,
		};
	});
