import type { Selection } from "kysely";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { UsersId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";

export const getUserById = <SE extends ReceiptsSelectExpression<"users">>(
	database: Database,
	id: UsersId,
	selectExpression: SE[],
): Promise<Selection<ReceiptsDatabase, "users", SE> | undefined> =>
	database
		.selectFrom("users")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();
