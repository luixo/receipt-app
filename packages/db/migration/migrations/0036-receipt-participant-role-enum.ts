import { sql } from "kysely";

import type { Database } from "~db/database";

export const up = async (db: Database) => {
	await sql`CREATE TYPE receipt_role AS ENUM ('viewer', 'editor', 'owner')`.execute(
		db,
	);
	await sql`
		ALTER TABLE "receiptParticipants"
		ALTER COLUMN role TYPE receipt_role USING role::receipt_role
	`.execute(db);
};

export const down = async (db: Database) => {
	await sql`
		ALTER TABLE "receiptParticipants"
		ALTER COLUMN role TYPE varchar(255) USING role::text
	`.execute(db);
	await sql`DROP TYPE receipt_role`.execute(db);
};
