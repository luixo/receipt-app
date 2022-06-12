import { Selection } from "kysely";
import { ReceiptsSelectExpression, ReceiptsDatabase, Database } from "../../db";
import { ReceiptsId, UsersId } from "../../db/models";

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receipt_participants">
>(
	database: Database,
	userId: UsersId,
	receiptId: ReceiptsId,
	selectExpression: SE[]
): Promise<
	Selection<ReceiptsDatabase, "receipt_participants", SE> | undefined
> => {
	return database
		.selectFrom("receipt_participants")
		.where("receiptId", "=", receiptId)
		.where("userId", "=", userId)
		.select(selectExpression)
		.executeTakeFirst();
};
