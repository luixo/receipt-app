import { Selection } from "kysely";

import { ReceiptsSelectExpression, ReceiptsDatabase, Database } from "../../db";
import { ReceiptsId, UsersId } from "../../db/models";

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">
>(
	database: Database,
	userId: UsersId,
	receiptId: ReceiptsId,
	selectExpression: SE[]
): Promise<
	Selection<ReceiptsDatabase, "receiptParticipants", SE> | undefined
> =>
	database
		.selectFrom("receiptParticipants")
		.where("receiptId", "=", receiptId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
