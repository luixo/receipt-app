import * as fs from "fs";
import { Migrator, FileMigrationProvider, MigrationResult } from "kysely";
import * as path from "path";
import * as util from "util";

import type { Database } from "./index";

type MigrateOptions = {
	database: Database;
	target: "latest" | "up" | "down";
	schemaName?: string;
};

type MigrationResponse =
	| {
			ok: true;
			results: MigrationResult[];
	  }
	| {
			ok: false;
			error: unknown;
			results: MigrationResult[];
	  };

export const migrate = async ({
	target,
	database,
	schemaName,
}: MigrateOptions): Promise<MigrationResponse> => {
	const migrator = new Migrator({
		db: database,
		// see https://github.com/kysely-org/kysely/issues/648
		migrationTableSchema: schemaName,
		provider: new FileMigrationProvider({
			fs: { readdir: util.promisify(fs.readdir) },
			path,
			migrationFolder: path.join(__dirname, "./migrations"),
		}),
	});

	const { error, results } = await migrator[
		target === "latest"
			? "migrateToLatest"
			: target === "down"
			? "migrateDown"
			: "migrateUp"
	]();

	if (error) {
		return {
			ok: false,
			error,
			results: results!,
		};
	}
	return {
		ok: true,
		results: results!,
	};
};
