import * as trpc from "@trpc/server";
import { Selection } from "kysely";
import { z } from "zod";

import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";
import { assignableRoleSchema } from "next-app/handlers/validation";

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">
>(
	database: Database,
	userId: UsersId,
	receiptId: ReceiptsId,
	selectExpression: SE[]
): Promise<
	Selection<ReceiptsDatabase, "receiptParticipants", SE> | undefined
> =>
	database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();

export const addReceiptParticipants = async (
	database: Database,
	receiptId: ReceiptsId,
	receiptOwnerId: AccountsId,
	usersToAdd: [UsersId, z.infer<typeof assignableRoleSchema>][]
) => {
	const userIds = usersToAdd.map(([id]) => id);
	const users = await database
		.selectFrom("users")
		.select(["id", "ownerAccountId"])
		.where("id", "in", userIds)
		.execute();
	if (users.length !== userIds.length) {
		const missedUserIds = userIds.filter(
			(userId) => !users.some((user) => user.id === userId)
		);
		throw new trpc.TRPCError({
			code: "NOT_FOUND",
			message: `User(s) ${missedUserIds.join(", ")} do(es) not exist.`,
		});
	}
	const notOwnedUsers = users.filter(
		(user) => user.ownerAccountId !== receiptOwnerId
	);
	if (notOwnedUsers.length !== 0) {
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Not enough rights to add user(s) ${notOwnedUsers
				.map(({ id }) => id)
				.join(", ")} to a receipt.`,
		});
	}
	const receiptParticipants = await database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.where("userId", "in", userIds)
		.select(["userId"])
		.execute();
	if (receiptParticipants.length !== 0) {
		throw new trpc.TRPCError({
			code: "CONFLICT",
			message: `User(s) ${receiptParticipants.map(
				({ userId }) => userId
			)} already participate(s) in receipt ${receiptId}.`,
		});
	}
	const result = await database
		.insertInto("receiptParticipants")
		.values(
			usersToAdd.map(([id, role]) => ({
				receiptId,
				userId: id,
				role: receiptOwnerId === id ? "owner" : role,
			}))
		)
		.returning("added")
		.execute();
	return {
		added: result.map(({ added }) => added),
	};
};
