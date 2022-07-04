import { Selection } from "kysely";
import { Database, ReceiptsSelectExpression, ReceiptsDatabase } from "../../db";
import { AccountsId } from "../../db/models";

export const getAccountById = <SE extends ReceiptsSelectExpression<"accounts">>(
	database: Database,
	id: AccountsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "accounts", SE> | undefined> => {
	return database
		.selectFrom("accounts")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();
};

export const getAccountByEmail = <
	SE extends ReceiptsSelectExpression<"accounts">
>(
	database: Database,
	email: string,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "accounts", SE> | undefined> => {
	return database
		.selectFrom("accounts")
		.select(selectExpression)
		.where("email", "=", email)
		.executeTakeFirst();
};
