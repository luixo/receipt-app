import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import type { UsersId } from "next-app/db/models";
import { queueCallFactory } from "next-app/handlers/batch";
import type { AuthorizedContext } from "next-app/handlers/context";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

const fetchUsers = async (
	{ database, auth }: AuthorizedContext,
	ids: UsersId[],
) => {
	const users = await database
		.selectFrom("users")
		.leftJoin("accounts", (qb) =>
			qb.onRef("connectedAccountId", "=", "accounts.id"),
		)
		.where("users.id", "in", ids)
		.where("users.ownerAccountId", "=", auth.accountId)
		.select([
			"users.id",
			"users.name",
			"users.publicName",
			"users.ownerAccountId",
			"accounts.id as accountId",
			"accounts.avatarUrl",
			"accounts.email",
			sql.lit("own").$castTo<"own">().as("type"),
		])
		.execute();
	const matchedUsers = users.map((user) => user.id);
	const missingUsers = ids.filter((id) => !matchedUsers.includes(id));
	if (missingUsers.length !== 0) {
		// We allow account fetch foreign users
		// In case they share the same receipt
		const foreignUsers = await database
			.selectFrom("users as usersThem")
			.where("usersThem.id", "in", missingUsers)
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
					.on("usersMe.connectedAccountId", "=", auth.accountId),
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
				"usersMine.id",
				"usersMine.name",
				"usersMine.publicName",
				"usersMine.ownerAccountId",
				"accounts.id as accountId",
				"accounts.email",
				"accounts.avatarUrl",
				"usersThem.id as theirId",
				"usersThem.name as theirName",
				"usersThem.publicName as theirPublicName",
				sql.lit("foreign").$castTo<"foreign">().as("type"),
			])
			.groupBy([
				"usersMine.id",
				"usersMine.name",
				"usersMine.publicName",
				"accounts.id",
				"accounts.email",
				"accounts.avatarUrl",
				"usersThem.id",
				"usersThem.name",
				"usersThem.publicName",
			])
			.execute();
		return [...users, ...foreignUsers];
	}
	return users;
};

const mapUser = (user: Awaited<ReturnType<typeof fetchUsers>>[number]) => {
	if (user.type === "own") {
		return {
			remoteId: user.id,
			name: user.name,
			publicName: user.publicName === null ? undefined : user.publicName,
			localId: user.id as UsersId | null,
			connectedAccount:
				user.email === null || user.accountId === null
					? undefined
					: {
							id: user.accountId,
							email: user.email,
							avatarUrl: user.avatarUrl || undefined,
					  },
		};
	}
	if (user.id) {
		/* c8 ignore start */
		if (!user.accountId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Unexpected not having accountId on a user result: ${user.accountId}.`,
			});
		}
		if (!user.email) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Unexpected not having email on a user result: ${user.email}.`,
			});
		} /* c8 ignore start */
		if (!user.name) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Unexpected not having name on a user result: ${user.name}`,
			});
		}
		/* c8 ignore stop */
		return {
			name: user.name,
			publicName: user.publicName === null ? undefined : user.publicName,
			remoteId: user.theirId,
			connectedAccount: {
				id: user.accountId,
				email: user.email,
				avatarUrl: user.avatarUrl || undefined,
			},
			localId: user.id,
		};
	}
	return {
		name: user.theirPublicName || user.theirName,
		publicName:
			user.theirPublicName === null ? undefined : user.theirPublicName,
		remoteId: user.theirId,
		connectedAccount: undefined,
		localId: null as UsersId | null,
	};
};

const queueUser = queueCallFactory<
	AuthorizedContext,
	{ id: UsersId },
	ReturnType<typeof mapUser>,
	Awaited<ReturnType<typeof fetchUsers>>
>(
	async (ctx, inputs) =>
		fetchUsers(
			ctx,
			inputs.map(({ id }) => id),
		),
	async (_ctx, input, users) => {
		const matchedUser = users.find((user) => {
			if (user.type === "own") {
				return user.id === input.id;
			}
			return user.theirId === input.id;
		});
		if (!matchedUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}".`,
			});
		}
		return mapUser(matchedUser);
	},
);

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(queueUser);
