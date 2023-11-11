import type { Selection } from "kysely";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { ReceiptItemsId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";

export const getReceiptItemById = <
	SE extends ReceiptsSelectExpression<"receiptItems">,
>(
	database: Database,
	id: ReceiptItemsId,
	selectExpression: SE[],
): Promise<Selection<ReceiptsDatabase, "receiptItems", SE> | undefined> =>
	database
		.selectFrom("receiptItems")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();
