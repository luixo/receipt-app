import { Selection } from "kysely";
import { ReceiptsSelectExpression, ReceiptsDatabase, Database } from "../../db";
import { ReceiptItemsId, UsersId } from "../../db/models";

export const getItemParticipant = <
	SE extends ReceiptsSelectExpression<"itemParticipants">
>(
	database: Database,
	userId: UsersId,
	itemId: ReceiptItemsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "itemParticipants", SE> | undefined> => {
	return database
		.selectFrom("itemParticipants")
		.where("itemId", "=", itemId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
};
