import { TRPCError } from "@trpc/server";
import type { Selection } from "kysely";
import type { z } from "zod";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";
import type { assignableRoleSchema } from "next-app/handlers/validation";

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">,
>(
	database: Database,
	userId: UsersId,
	receiptId: ReceiptsId,
	selectExpression: SE[],
): Promise<
	Selection<ReceiptsDatabase, "receiptParticipants", SE> | undefined
> =>
	database
		.selectFrom("receiptParticipants")
		.where((eb) => eb.and({ receiptId, userId }))
		.select(selectExpression)
		.executeTakeFirst();

export const addReceiptParticipants = async (
	database: Database,
	receiptId: ReceiptsId,
	receiptOwnerId: AccountsId,
	receiptOwnerEmail: string,
	usersToAdd: [UsersId, z.infer<typeof assignableRoleSchema>][],
) => {
	const userIds = usersToAdd.map(([id]) => id);
	const users = await database
		.selectFrom("users")
		.leftJoin("accounts", (qb) =>
			qb.onRef("accounts.id", "=", "users.connectedAccountId"),
		)
		.select([
			"users.id",
			"users.ownerAccountId",
			"users.name",
			"users.publicName",
			"accounts.id as accountId",
			"accounts.email",
		])
		.where("users.id", "in", userIds)
		.execute();
	if (users.length !== userIds.length) {
		const missedUserIds = userIds.filter(
			(userId) => !users.some((user) => user.id === userId),
		);
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `${missedUserIds.length === 1 ? "User" : "Users"} ${missedUserIds
				.map((id) => `"${id}"`)
				.join(", ")} ${missedUserIds.length === 1 ? "does" : "do"} not exist.`,
		});
	}
	const notOwnedUsers = users.filter(
		(user) => user.ownerAccountId !== receiptOwnerId,
	);
	if (notOwnedUsers.length !== 0) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `${notOwnedUsers.length === 1 ? "User" : "Users"} ${notOwnedUsers
				.map(({ id }) => `"${id}"`)
				.join(", ")} ${
				notOwnedUsers.length === 1 ? "is" : "are"
			} not owned by "${receiptOwnerEmail}".`,
		});
	}
	const userData = userIds.map((userId) => {
		const { ownerAccountId: disregardedOwnerAccountId, ...user } = users.find(
			({ id }) => id === userId,
		)!;
		return user;
	});
	const receiptParticipants = await database
		.selectFrom("receiptParticipants")
		.where((eb) => eb("receiptId", "=", receiptId).and("userId", "in", userIds))
		.select(["userId"])
		.execute();
	if (receiptParticipants.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `${
				receiptParticipants.length === 1 ? "User" : "Users"
			} ${receiptParticipants
				.map(({ userId }) => `"${userId}"`)
				.join(", ")} already ${
				receiptParticipants.length === 1 ? "participates" : "participate"
			} in receipt "${receiptId}".`,
		});
	}
	const result = await database
		.insertInto("receiptParticipants")
		.values(
			usersToAdd.map(([id, role]) => ({
				receiptId,
				userId: id,
				role: receiptOwnerId === id ? "owner" : role,
				added: new Date(),
			})),
		)
		.returning(["added", "userId"])
		.execute();
	return usersToAdd.map(([id, role]) => {
		const { email, accountId, ...userDatum } = userData.find(
			(user) => user.id === id,
		)!;
		const addedDatum = result.find(({ userId }) => userId === id)!;
		return {
			added: addedDatum.added,
			role: receiptOwnerId === id ? ("owner" as const) : role,
			account:
				email === null || accountId === null
					? undefined
					: { email, id: accountId, avatarUrl: undefined },
			...userDatum,
		};
	});
};
