import type { Database } from "~db/database";

import {
	createDebtsSyncIntentionsTable,
	removeDebtsSyncIntentionsTable,
} from "./0011-debt-timestamp-lock";

export const up = async (db: Database) => {
	await removeDebtsSyncIntentionsTable(db);
};

export const down = async (db: Database) => {
	await createDebtsSyncIntentionsTable(db);
	// A poor attempt to restore intentions from less data that we used to have
	await db
		// Errors are expected as table does not exist anymore
		// @ts-expect-error Error is expected as table does not exist anymore
		.insertInto("debtsSyncIntentions")
		// @ts-expect-error Error is expected as column does not exist anymore
		.columns(["debtId", "ownerAccountId", "lockedTimestamp"])
		.expression((eb) =>
			eb
				.selectFrom("debts")
				.where((ebb) =>
					ebb.and([
						// @ts-expect-error Error is expected as column does not exist anymore
						ebb("lockedTimestamp", "is not", null),
						ebb(
							"id",
							"in",
							eb
								.selectFrom("debts")
								.select("id")
								.groupBy("id")
								.having(eb.fn.countAll(), "=", 1),
						),
					]),
				)
				// @ts-expect-error Error is expected as column does not exist anymore
				.select(["id as debtId", "ownerAccountId", "lockedTimestamp"]),
		)
		.execute();
};
