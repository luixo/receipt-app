import type { NoMigrations } from "kysely";
import { Migrator } from "kysely";
import type { TSFileMigrationProviderProps } from "kysely-ctl";
import { TSFileMigrationProvider } from "kysely-ctl";
import path from "node:path";
import * as url from "node:url";

import type { Database } from "~db/types";

export const migrate = async (
	database: Database,
	action: "latest" | "up" | "down" | { to: string | NoMigrations },
	{ migrationFolder, ...props }: TSFileMigrationProviderProps,
) => {
	const migrationProvider = new TSFileMigrationProvider({
		migrationFolder: path.resolve(
			url.fileURLToPath(new URL("../../..", import.meta.url).toString()),
			migrationFolder,
		),
		...props,
	});
	const migrator = new Migrator({
		db: database,
		provider: migrationProvider,
	});
	switch (action) {
		case "latest":
			return migrator.migrateToLatest();
		case "up":
			return migrator.migrateUp();
		case "down":
			return migrator.migrateDown();
		default:
			return migrator.migrateTo(action.to);
	}
};
