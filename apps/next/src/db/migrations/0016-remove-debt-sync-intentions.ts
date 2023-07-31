import {
	createDebtsSyncIntentionsTable,
	removeDebtsSyncIntentionsTable,
} from "next-app/db/migrations/0011-debt-timestamp-lock";

import { Database } from "..";

export const up = async (db: Database) => {
	await removeDebtsSyncIntentionsTable(db);
};

export const down = async (db: Database) => {
	await createDebtsSyncIntentionsTable(db);
	// A poor attempt to restore intentions from less data that we used to have
	await db
		// Error are expected as table does not exist anymore
		// @ts-expect-error
		.insertInto("debtsSyncIntentions")
		// @ts-expect-error
		.columns(["debtId", "ownerAccountId", "lockedTimestamp"])
		.expression((eb) =>
			eb
				.selectFrom("debts")
				.where((subEb) =>
					subEb.and([
						subEb("lockedTimestamp", "is not", null),
						subEb(
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
				.select(["id as debtId", "ownerAccountId", "lockedTimestamp"]),
		)
		.execute();
};
