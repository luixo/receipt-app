import type { SelectExpression, Selection } from "kysely";

import type { Database } from "~db/database";
import type { PeerId, ReceiptId } from "~db/ids";
import type { DB } from "~db/types.gen";

type ReceiptsSelectExpression<TB extends keyof DB> = SelectExpression<DB, TB>;

export const getReceiptParticipant = <
	SE extends ReceiptsSelectExpression<"receiptParticipants">,
>(
	database: Database,
	peerId: PeerId,
	receiptId: ReceiptId,
	selectExpression: SE[],
): Promise<Selection<DB, "receiptParticipants", SE> | undefined> =>
	database
		.selectFrom("receiptParticipants")
		.where((eb) => eb.and({ receiptId, peerId }))
		.select(selectExpression)
		.limit(1)
		.executeTakeFirst();
