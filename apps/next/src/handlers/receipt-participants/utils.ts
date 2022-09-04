import * as trpc from "@trpc/server";
import { Selection } from "kysely";
import { z } from "zod";

import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";
import { verifyUsersByIds } from "next-app/handlers/users/utils";
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
	const userData = await verifyUsersByIds(database, userIds, receiptOwnerId);
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
		.returning(["added", "userId"])
		.execute();
	return usersToAdd.map(([id, role]) => {
		const userDatum = userData.find((user) => user.id === id)!;
		const addedDatum = result.find(({ userId }) => userId === id)!;
		return {
			added: addedDatum.added,
			role: receiptOwnerId === id ? ("owner" as const) : role,
			...userDatum,
		};
	});
};
