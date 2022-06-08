import { Migrator, FileMigrationProvider } from "kysely";
import * as path from "path";
import { getDatabase } from ".";

async function main() {
	const database = getDatabase();
	const migrator = new Migrator({
		db: database,
		provider: new FileMigrationProvider(path.join(__dirname, "./migrations")),
	});

	const { error, results } = await migrator.migrateToLatest();

	results?.forEach((result) => {
		if (result.status === "Success") {
			console.log(
				`Migration "${result.migrationName}" was executed successfully`
			);
		} else if (result.status === "Error") {
			console.error(`Failed to execute migration "${result.migrationName}"`);
		}
	});

	if (error) {
		console.error("Failed to migrate");
		console.error(error);
		process.exit(1);
	}

	await database.destroy();
}

void main();
