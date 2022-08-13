import { migrate } from "next-app/db/migration";

const main = async () => {
	const migrationResult = await migrate({
		target: "latest",
	});
	if (migrationResult.ok) {
		if (migrationResult.results.length === 0) {
			console.log("No migrations to execute");
		}
		migrationResult.results.forEach((result) => {
			if (result.status === "Success") {
				console.log(
					`Migration "${result.migrationName}" was executed successfully`
				);
			} else if (result.status === "Error") {
				console.error(`Failed to execute migration "${result.migrationName}"`);
			}
		});
	} else {
		console.error("Failed to migrate");
		console.error(migrationResult.error);
		process.exit(1);
	}
};

void main();
