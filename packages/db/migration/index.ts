import type { Migration, MigrationProvider, MigrationResult } from "kysely";
import { Migrator } from "kysely";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

import type { Database } from "~db/types";

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

// see https://github.com/kysely-org/kysely/issues/277
class ESMFileMigrationProvider implements MigrationProvider {
	constructor(private relativePath: string) {}

	async getMigrations(): Promise<Record<string, Migration>> {
		const migrations: Record<string, Migration> = {};
		const resolvedPath = path.resolve(
			url.fileURLToPath(new URL(".", import.meta.url).toString()),
			this.relativePath,
		);
		const files = await fs.readdir(resolvedPath);

		for (const fileName of files) {
			const importPath = path.join(resolvedPath, fileName);
			// eslint-disable-next-line no-await-in-loop
			const migration = (await import(importPath)) as Migration;
			const migrationKey = fileName.substring(0, fileName.lastIndexOf("."));
			migrations[migrationKey] = migration;
		}

		return migrations;
	}
}

export const migrate = async ({
	target,
	database,
	schemaName,
}: MigrateOptions): Promise<MigrationResponse> => {
	const migrator = new Migrator({
		db: database,
		// see https://github.com/kysely-org/kysely/issues/648
		migrationTableSchema: schemaName,
		provider: new ESMFileMigrationProvider("./migrations"),
	});

	const { error, results } =
		await migrator[
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
			results: results || [],
		};
	}
	return {
		ok: true,
		// According to docs results always exist if there's no error
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		results: results!,
	};
};
