import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { AccountsId, UsersId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { getParticipantsReceipts } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

// We allow account fetch foreign users
// In case they share the same receipt (as participant or as payer)
const fetchUsers = async (ctx: AuthorizedContext, ids: UsersId[]) =>
	ctx.database
		.with("mergedReceipts", (qc) =>
			getParticipantsReceipts(qc, ctx.auth.accountId)
				.groupBy("receipts.id")
				.select("receipts.id"),
		)
		.with("mergedParticipants", (qc) =>
			qc
				.selectFrom("receiptParticipants")
				.innerJoin("mergedReceipts", (qb) =>
					qb.onRef("receiptParticipants.receiptId", "=", "mergedReceipts.id"),
				)
				.groupBy("receiptParticipants.userId")
				.select("receiptParticipants.userId"),
		)
		.selectFrom("users as usersTheir")
		.where("usersTheir.id", "in", ids)
		.innerJoin("mergedParticipants", (qb) =>
			qb.onRef("usersTheir.id", "=", "mergedParticipants.userId"),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("usersTheir.connectedAccountId", "=", "accounts.id"),
		)
		.leftJoin("users as usersMine", (qb) =>
			qb
				.onRef(
					"usersMine.connectedAccountId",
					"=",
					"usersTheir.connectedAccountId",
				)
				.on("usersMine.ownerAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"usersMine.id as mineId",
			"usersMine.name as mineName",
			"usersMine.publicName as minePublicName",
			"accounts.id as accountId",
			"accounts.email",
			"accounts.avatarUrl",
			"usersTheir.id as theirId",
			"usersTheir.name as theirName",
			"usersTheir.publicName as theirPublicName",
			"usersTheir.ownerAccountId",
		])
		.groupBy([
			"usersMine.id",
			"usersMine.name",
			"usersMine.publicName",
			"accounts.id",
			"accounts.email",
			"accounts.avatarUrl",
			"usersTheir.id",
			"usersTheir.name",
			"usersTheir.publicName",
			"usersTheir.ownerAccountId",
		])
		.execute();

// Excessive function is needed to properly infer return types
const getForeignUser = (
	user: Awaited<ReturnType<typeof fetchUsers>>[number],
) => ({
	remoteId: user.theirId,
	name: user.theirPublicName || user.theirName,
});

const mapUser = (user: Awaited<ReturnType<typeof fetchUsers>>[number]) => {
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
	ReturnType<typeof mapUser>
>((ctx) => async (inputs) => {
	const users = await fetchUsers(
		ctx,
		inputs.map(({ id }) => id),
	);
	return inputs.map((input) => {
		const matchedUser = users.find((user) => user.theirId === input.id);
		if (!matchedUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `No user found by id "${input.id}" or you don't have access to it.`,
			});
		}
		return mapUser(matchedUser);
	});
});

export const procedure = authProcedure
	.input(z.strictObject({ id: userIdSchema }))
	.query(queueUser);
