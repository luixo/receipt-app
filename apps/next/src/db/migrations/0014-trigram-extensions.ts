import { sql } from "kysely";

import { Database } from "..";

const addTrigramExtension = async (db: Database) => {
	await sql`create extension if not exists pg_trgm`.execute(db);
};

const removeTrigramExtension = async (db: Database) => {
	await sql`drop extension pg_trgm`.execute(db);
};

export const up = async (db: Database) => {
	await addTrigramExtension(db);
};

export const down = async (db: Database) => {
	await removeTrigramExtension(db);
};
