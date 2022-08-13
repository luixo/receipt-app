// @ts-ignore
import { recase } from "@kristiandupont/recase";
import { processDatabase } from "kanel";
import path from "path";

import { getDatabaseConfig } from "next-app/src/db/config";

const run = async () => {
	console.log(`\n> Generating types...`);
	try {
		await processDatabase({
			connection: getDatabaseConfig(),
			preDeleteModelFolder: true,
			modelNominator: recase("snake", "pascal"),
			typeNominator: recase("snake", "pascal"),
			fileNominator: recase("pascal", "dash"),
			schemas: [
				{
					name: "public",
					ignore: ["__diesel_schema_migrations"],
					modelFolder: path.join(__dirname, "../apps/next/src/db/models"),
				},
			],
		});
		console.log(`< Types successfully generated!`);
	} catch (e) {
		console.error(`< Error generating types:`, e);
	}
};

void run();
