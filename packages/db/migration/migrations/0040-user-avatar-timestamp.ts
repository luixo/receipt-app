import { sql } from "kysely";

import type { Database } from "~db/database";
import { CURRENT_TIMESTAMP } from "~db/migration/consts";

export const up = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.renameColumn("avatarUrl", "avatarTimestamp")
		.execute();
	await db.schema
		.alterTable("users")
		.alterColumn("avatarTimestamp", (column) =>
			column.setDataType(
				sql`timestamptz using case when ${sql.ref("avatarTimestamp")} is null then null else ${CURRENT_TIMESTAMP} end`,
			),
		)
		.execute();
};

export const down = async (db: Database) => {
	// Explicitly clear all avatars on rollback instead of reconstructing their URLs.
	await db.schema
		.alterTable("users")
		.alterColumn("avatarTimestamp", (column) =>
			column.setDataType(sql`text using null`),
		)
		.execute();
	await db.schema
		.alterTable("users")
		.renameColumn("avatarTimestamp", "avatarUrl")
		.execute();
};
