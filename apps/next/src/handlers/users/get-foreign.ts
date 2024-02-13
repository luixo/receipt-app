import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountsId, UsersId } from "next-app/db/models";
import { queueCallFactory } from "next-app/handlers/batch";
import type { AuthorizedContext } from "next-app/handlers/context";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

// We allow account fetch foreign users
// In case they share the same receipt
const fetchUsers = async (
	{ database, auth }: AuthorizedContext,
	ids: UsersId[],
) =>
	database
		.selectFrom("users as usersThem")
		.where("usersThem.id", "in", ids)
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
			"usersMine.id as mineId",
			"usersMine.name as mineName",
			"usersMine.publicName as minePublicName",
			"accounts.id as accountId",
			"accounts.email",
			"accounts.avatarUrl",
			"usersThem.id as theirId",
			"usersThem.name as theirName",
			"usersThem.publicName as theirPublicName",
			"usersThem.ownerAccountId",
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
			"usersThem.ownerAccountId",
		])
		.execute();

// Excessive function is needed to properly infer return types
const getForeignUser = (
	user: Awaited<ReturnType<typeof fetchUsers>>[number],
) => ({
	remoteId: user.theirId,
	name: user.theirPublicName || user.theirName,
});

const mapUser = (
	{ auth }: AuthorizedContext,
	user: Awaited<ReturnType<typeof fetchUsers>>[number],
) => {
	if (user.ownerAccountId === auth.accountId) {
		return {
			id: user.theirId,
			name: user.theirName,
			publicName:
				user.theirPublicName === null ? undefined : user.theirPublicName,
			connectedAccount: {
				id: user.accountId,
				email: user.email,
				avatarUrl: user.avatarUrl || undefined,
			} as
				| {
						id: AccountsId;
						email: string;
						avatarUrl?: string;
				  }
				| undefined,
		};
	}
	if (user.mineId && user.mineName && user.email && user.accountId) {
		return {
			id: user.mineId,
			name: user.mineName,
			publicName:
				user.minePublicName === null ? undefined : user.minePublicName,
			connectedAccount: {
				id: user.accountId,
				email: user.email,
				avatarUrl: user.avatarUrl || undefined,
			} as
				| {
						id: AccountsId;
						email: string;
						avatarUrl?: string;
				  }
				| undefined,
		};
	}
	return getForeignUser(user);
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
	async (ctx, input, users) => {
		const matchedUser = users.find((user) => user.theirId === input.id);
		if (!matchedUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}" or you don't have access to it.`,
			});
		}
		return mapUser(ctx, matchedUser);
	},
);

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(queueUser);
