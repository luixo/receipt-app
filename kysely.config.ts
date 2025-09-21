// Basically, this is a config from `db` package
// But we have to keep it in the root to make it read env files
/* eslint-disable import-x/no-extraneous-dependencies */
import { Kysely, PostgresDialect } from "kysely";
import { defineConfig } from "kysely-ctl";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
	throw new Error("Expected to have process.env.DATABASE_URL variable!");
}

export default defineConfig({
	kysely: new Kysely({
		dialect: new PostgresDialect({
			pool: new Pool({ connectionString: process.env.DATABASE_URL }),
		}),
	}),
	migrations: {
		migrationFolder: "packages/db/migration/migrations",
	},
});
