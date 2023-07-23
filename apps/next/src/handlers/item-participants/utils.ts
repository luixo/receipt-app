import { Selection } from "kysely";

import { ReceiptsSelectExpression, Database } from "next-app/db";
import { ReceiptItemsId, UsersId } from "next-app/db/models";
import { ReceiptsDatabase } from "next-app/db/types";

export const getItemParticipant = <
	SE extends ReceiptsSelectExpression<"itemParticipants">,
>(
	database: Database,
	userId: UsersId,
	itemId: ReceiptItemsId,
	selectExpression: SE[],
): Promise<Selection<ReceiptsDatabase, "itemParticipants", SE> | undefined> =>
	database
		.selectFrom("itemParticipants")
		.where("itemId", "=", itemId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
