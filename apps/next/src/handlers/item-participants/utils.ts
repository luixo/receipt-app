import { Selection } from "kysely";
import { ReceiptsSelectExpression, ReceiptsDatabase, Database } from "../../db";
import { ReceiptItemsId, UsersId } from "../../db/models";

export const getItemParticipant = <
	SE extends ReceiptsSelectExpression<"item_participants">
>(
	database: Database,
	userId: UsersId,
	itemId: ReceiptItemsId,
	selectExpression: SE[]
): Promise<
	Selection<ReceiptsDatabase, "item_participants", SE> | undefined
> => {
	return database
		.selectFrom("item_participants")
		.where("itemId", "=", itemId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
};
