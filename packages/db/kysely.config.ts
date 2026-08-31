// Basically, this is a config from `db` package
// But we have to keep it in the root to make it read env files
import { Kysely, PostgresDialect } from "kysely";
import { defineConfig } from "kysely-ctl";
import { Pool } from "pg";

const databaseUrl = import.meta.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("Expected to have import.meta.env.DATABASE_URL variable!");
}

export default defineConfig({
	kysely: new Kysely({
		dialect: new PostgresDialect({
			pool: new Pool({ connectionString: databaseUrl }),
		}),
	}),
	migrations: {
		migrationFolder: "migration/migrations",
	},
});
