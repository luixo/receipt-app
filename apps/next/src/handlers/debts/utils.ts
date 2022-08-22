import { Selection } from "kysely";

import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { AccountsId, DebtsId } from "next-app/db/models";

export const getDebt = <SE extends ReceiptsSelectExpression<"debts">>(
	database: Database,
	id: DebtsId,
	ownerAccountId: AccountsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "debts", SE> | undefined> =>
	database
		.selectFrom("debts")
		.where("id", "=", id)
		.where("ownerAccountId", "=", ownerAccountId)
		.select(selectExpression)
		.executeTakeFirst();
