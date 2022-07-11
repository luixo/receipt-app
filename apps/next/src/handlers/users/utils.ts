import { Selection, SelectQueryBuilder } from "kysely";

import { Database, ReceiptsSelectExpression, ReceiptsDatabase } from "../../db";
import { UsersId } from "../../db/models";

export const getUserById = <SE extends ReceiptsSelectExpression<"users">>(
	database: Database,
	id: UsersId,
	selectExpression: SE[],
	queryBuilder?: <O>(
		qb: SelectQueryBuilder<ReceiptsDatabase, "users", O>
	) => SelectQueryBuilder<ReceiptsDatabase, "users", O>
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
