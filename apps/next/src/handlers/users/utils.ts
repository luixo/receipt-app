import * as trpc from "@trpc/server";
import { Selection, SelectQueryBuilder } from "kysely";

import { Database, ReceiptsSelectExpression } from "next-app/db";
import { AccountsId, UsersId } from "next-app/db/models";
import { ReceiptsDatabase } from "next-app/db/types";

export const getUserById = <SE extends ReceiptsSelectExpression<"users">>(
	database: Database,
	id: UsersId,
	selectExpression: SE[],
	queryBuilder?: <O>(
		qb: SelectQueryBuilder<ReceiptsDatabase, "users", O>,
	) => SelectQueryBuilder<ReceiptsDatabase, "users", O>,
): Promise<Selection<ReceiptsDatabase, "users", SE> | undefined> => {
	let selection = database
		.selectFrom("users")
		.select(selectExpression)
		.where("id", "=", id);
	if (queryBuilder) {
		selection = queryBuilder(selection);
	}
	return selection.executeTakeFirst();
};

export const verifyUsersByIds = async (
	database: Database,
	userIds: UsersId[],
	ownerAccountId: AccountsId,
) => {
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
		throw new trpc.TRPCError({
			code: "NOT_FOUND",
			message: `User(s) ${missedUserIds.join(", ")} do(es) not exist.`,
		});
	}
	const notOwnedUsers = users.filter(
		(user) => user.ownerAccountId !== ownerAccountId,
	);
	if (notOwnedUsers.length !== 0) {
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Not enough rights to add user(s) ${notOwnedUsers
				.map(({ id }) => id)
				.join(", ")} to a receipt.`,
		});
	}
	return userIds.map((userId) => {
		const { ownerAccountId: disregardedOwnerAccountId, ...user } = users.find(
			({ id }) => id === userId,
		)!;
		return user;
	});
};
