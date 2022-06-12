import { Selection } from "kysely";
import { Database, ReceiptsSelectExpression, ReceiptsDatabase } from "../../db";
import { ReceiptItemsId } from "../../db/models";

export const getReceiptItemById = <
	SE extends ReceiptsSelectExpression<"receipt_items">
>(
	database: Database,
	id: ReceiptItemsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "receipt_items", SE> | undefined> => {
	return database
		.selectFrom("receipt_items")
		.select(selectExpression)
		.where("id", "=", id)
		.executeTakeFirst();
};
