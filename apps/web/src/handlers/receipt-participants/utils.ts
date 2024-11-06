import type { Selection } from "kysely";

import type { ReceiptsId, UsersId } from "~db/models";
import type {
	Database,
	ReceiptsDatabase,
	ReceiptsSelectExpression,
} from "~db/types";

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">,
>(
	database: Database,
	userId: UsersId,
	receiptId: ReceiptsId,
	selectExpression: SE[],
): Promise<
	Selection<ReceiptsDatabase, "receiptParticipants", SE> | undefined
> =>
	database
		.selectFrom("receiptParticipants")
		.where((eb) => eb.and({ receiptId, userId }))
		.select(selectExpression)
		.limit(1)
		.executeTakeFirst();
