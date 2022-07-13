import { Selection } from "kysely";

import {
	Database,
	ReceiptsSelectExpression,
	ReceiptsDatabase,
} from "next-app/db";
import { ReceiptItemsId } from "next-app/db/models";

export const getReceiptItemById = <
	SE extends ReceiptsSelectExpression<"receiptItems">
>(
	database: Database,
	id: ReceiptItemsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "receiptItems", SE> | undefined> =>
	database
		.selectFrom("receiptItems")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();
