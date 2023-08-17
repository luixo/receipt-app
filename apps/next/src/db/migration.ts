import * as fs from "fs";
import { Migrator, FileMigrationProvider, MigrationResult } from "kysely";
import * as path from "path";
import * as util from "util";

import { getDatabase } from "./index";

type MigrateOptions = {
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
	  };

export const migrate = async ({
	target,
	schemaName,
}: MigrateOptions): Promise<MigrationResponse> => {
	const database = getDatabase();
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

	await database.destroy();

	if (error) {
		return {
			ok: false,
			error,
		};
	}
	return {
		ok: true,
		results: results!,
	};
};
