import { Selection } from "kysely";

import { Database, ReceiptsSelectExpression } from "next-app/db";
import { AccountsId } from "next-app/db/models";
import { ReceiptsDatabase } from "next-app/db/types";

export const getAccountById = <SE extends ReceiptsSelectExpression<"accounts">>(
	database: Database,
	id: AccountsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "accounts", SE> | undefined> =>
	database
		.selectFrom("accounts")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();

export const getAccountByEmail = <
	SE extends ReceiptsSelectExpression<"accounts">
>(
	database: Database,
	email: string,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "accounts", SE> | undefined> =>
	database
		.selectFrom("accounts")
		.select(selectExpression)
		.where("email", "=", email)
		.executeTakeFirst();
