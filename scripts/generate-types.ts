// @ts-ignore
import { recase } from "@kristiandupont/recase";
import { TableColumn } from "extract-pg-schema";
import { processDatabase, generateIndexFile } from "kanel";
import path from "path";

import { getDatabaseConfig } from "next-app/src/db/config";

const fileRecase = recase("pascal", "dash");
const kebabToPascal = recase("dash", "pascal");

const run = async () => {
	console.log(`\n> Generating types...`);
	try {
		const outputPath = path.join(__dirname, "../apps/next/src/db/models");
		await processDatabase({
			connection: getDatabaseConfig(),
			outputPath,
			preDeleteOutputFolder: true,
			getMetadata: (details, generateFor) => ({
				name: kebabToPascal(
					generateFor === "selector"
						? details.name
						: `${details.name}-${generateFor}`
				),
				comment: undefined,
				path: path.join(outputPath, fileRecase(details.name)),
			}),
			getPropertyMetadata: (rawProperty, details, generateFor) => {
				const property = rawProperty as TableColumn;
				const comments = property.comment ? [property.comment] : [];
				if (property.indices) {
					comments.push(
						...property.indices.map(({ name, isPrimary }) =>
							isPrimary ? `Primary key. Index: ${name}` : `Index: ${name}`
						)
					);
				}
				if (property.defaultValue && generateFor === "initializer") {
					comments.push(`Default value: ${property.defaultValue}`);
				}
				return {
					name: property.name,
					comment: comments,
					typeOverride:
						property.name === "debtId" && details.name === "debtsSyncIntentions"
							? "DebtsId"
							: undefined,
				};
			},
			generateIdentifierType: (column, details) => ({
				declarationType: "typeDeclaration",
				name: kebabToPascal(`${details.name}-${column.name}`),
				exportAs: "named",
				typeDefinition: [`string & { __flavor?: '${details.name}' }`],
				comment: [`Identifier type for "${details.name}" table`],
			}),
			typeFilter: (pgType) => {
				if (pgType.name.includes("kysely")) {
					return false;
				}
				return true;
			},
			preRenderHooks: [generateIndexFile],
			postRenderHooks: [
				(filePath, lines) =>
					[
						"// @generated",
						"// Automatically generated. Don't change this file manually.",
						"",
						filePath.endsWith("debts-sync-intentions.ts")
							? "import { DebtsId } from './debts';"
							: undefined,
						...lines,
					].filter((s): s is string => s !== undefined),
			],
		});
		console.log(`< Types successfully generated!`);
	} catch (e) {
		console.error(`< Error generating types:`, e);
	}
};

void run();
