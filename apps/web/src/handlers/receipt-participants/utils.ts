import type { SelectExpression, Selection } from "kysely";

import type { Database } from "~db/database";
import type { ReceiptId, UserId } from "~db/ids";
import type { DB } from "~db/types.gen";

type ReceiptsSelectExpression<TB extends keyof DB> = SelectExpression<DB, TB>;

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">,
>(
	database: Database,
	userId: UserId,
	receiptId: ReceiptId,
	selectExpression: SE[],
): Promise<Selection<DB, "receiptParticipants", SE> | undefined> =>
	database
		.selectFrom("receiptParticipants")
		.where((eb) => eb.and({ receiptId, userId }))
		.select(selectExpression)
		.limit(1)
		.executeTakeFirst();
