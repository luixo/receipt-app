import type { Selection } from "kysely";

import type { Database, ReceiptsSelectExpression } from "next-app/db";
import type { ReceiptItemsId, UsersId } from "next-app/db/models";
import type { ReceiptsDatabase } from "next-app/db/types";

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
