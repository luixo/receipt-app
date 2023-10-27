import { TRPCError } from "@trpc/server";
import type { Selection } from "kysely";
import type { z } from "zod";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";
import { verifyUsersByIds } from "next-app/handlers/users/utils";
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
		.where("receiptId", "=", receiptId)
		.where("userId", "=", userId)
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
	const userData = await verifyUsersByIds(
		database,
		userIds,
		receiptOwnerId,
		receiptOwnerEmail,
	);
	const receiptParticipants = await database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.where("userId", "in", userIds)
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
		const userDatum = userData.find((user) => user.id === id)!;
		const addedDatum = result.find(({ userId }) => userId === id)!;
		return {
			added: addedDatum.added,
			role: receiptOwnerId === id ? ("owner" as const) : role,
			...userDatum,
		};
	});
};
