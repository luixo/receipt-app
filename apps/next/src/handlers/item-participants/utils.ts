import { Selection } from "kysely";

import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { ReceiptItemsId, UsersId } from "next-app/db/models";

export const getItemParticipant = <
	SE extends ReceiptsSelectExpression<"itemParticipants">
>(
	database: Database,
	userId: UsersId,
	itemId: ReceiptItemsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "itemParticipants", SE> | undefined> =>
	database
		.selectFrom("itemParticipants")
		.where("itemId", "=", itemId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
