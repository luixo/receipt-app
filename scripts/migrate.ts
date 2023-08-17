import { Pool } from "pg";

import { getDatabase } from "next-app/db";
import { getDatabaseConfig } from "next-app/db/config";
import { migrate } from "next-app/db/migration";
import { baseLogger } from "next-app/utils/logger";

const isValidTarget = (
	maybeTarget = "",
): maybeTarget is "up" | "down" | "latest" =>
	["up", "down", "latest"].includes(maybeTarget);

const main = async ([firstArg]: string[]) => {
	const target = isValidTarget(firstArg) ? firstArg : "latest";
	const database = getDatabase({
		logger: baseLogger,
		pool: new Pool(getDatabaseConfig()),
	});
	console.log(`Migration target: ${target}`);
	try {
		const migrationResult = await migrate({ target, database });
		if (!migrationResult.ok) {
			throw migrationResult.error;
		}
		if (migrationResult.results.length === 0) {
			console.log("No migrations to execute");
		}
		migrationResult.results.forEach((result) => {
			if (result.status === "Success") {
				console.log(
					`Migration "${result.migrationName}" was executed successfully`,
				);
			} else if (result.status === "Error") {
				console.error(`Failed to execute migration "${result.migrationName}"`);
			}
		});
	} catch (e) {
		console.error("Failed to migrate");
		console.error(e);
		process.exit(1);
	} finally {
		await database.destroy();
	}
};

void main(process.argv.slice(2));
