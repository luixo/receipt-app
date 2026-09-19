import { sql } from "kysely";

import type { Database } from "~db/database";

export const up = async (db: Database) => {
	await db.schema
		.createType("receiptRole")
		.asEnum(["viewer", "editor", "owner"])
		.execute();
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("role", (cb) =>
			cb.setDataType(sql`"receiptRole" using role::"receiptRole"`),
		)
		.execute();
};

export const down = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("role", (cb) =>
			cb.setDataType(sql`varchar(255) using role::text`),
		)
		.execute();
	await db.schema.dropType("receiptRole").execute();
};
