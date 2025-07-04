import { recase } from "@kristiandupont/recase";
import type { TableColumn } from "extract-pg-schema";
import * as kanel from "kanel";
import path from "node:path";

const { generateIndexFile, processDatabase } = (
	kanel as unknown as { default: typeof kanel }
).default;

const fileRecase = recase("pascal", "dash");
const kebabToPascal = recase("dash", "pascal");

const run = async () => {
	console.log(`\n> Generating types...`);
	try {
		if (!process.env.DATABASE_URL) {
			throw new Error("Expected to have process.env.DATABASE_URL variable!");
		}
		const outputPath = path.join(import.meta.dirname, "../src/models");
		await processDatabase({
			connection: process.env.DATABASE_URL,
			outputPath,
			preDeleteOutputFolder: true,
			getMetadata: (details, generateFor) => ({
				name: kebabToPascal(
					generateFor === "selector"
						? details.name
						: `${details.name}-${generateFor}`,
				),
				comment: undefined,
				path: path.join(outputPath, fileRecase(details.name)),
			}),
			getPropertyMetadata: (rawProperty, details, generateFor) => {
				let typeOverride: string | undefined;
				const property = rawProperty as TableColumn;
				const comments = property.comment ? [property.comment] : [];
				comments.push(
					...property.indices.map(({ name, isPrimary }) =>
						isPrimary ? `Primary key. Index: ${name}` : `Index: ${name}`,
					),
				);
				if (property.defaultValue && generateFor === "initializer") {
					comments.push(`Default value: ${property.defaultValue}`);
				}
				if (property.name === "currencyCode") {
					typeOverride = "CurrencyCode";
				}
				return {
					name: property.name,
					comment: comments,
					typeOverride,
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
				if (
					pgType.name.includes("kysely") ||
					pgType.name.includes("updatetimestampcolumn")
				) {
					return false;
				}
				return true;
			},
			preRenderHooks: [generateIndexFile],
			postRenderHooks: [
				(_filePath, lines) => {
					const prepended = [
						"// @generated",
						"// Automatically generated. Don't change this file manually.",
						"",
					];
					if (
						lines.some((line) => line.includes(": CurrencyCode")) &&
						!lines.some((line) => line.includes("type CurrencyCode"))
					) {
						prepended.push(
							"import type { CurrencyCode } from '~app/utils/currency';",
						);
					}
					if (
						lines.some((line) => line.includes(": DebtsId")) &&
						!lines.some((line) => line.includes("type DebtsId"))
					) {
						prepended.push("import type { DebtsId } from './debts';");
					}
					return [...prepended, ...lines];
				},
			],
		});
		console.log(`< Types successfully generated!`);
	} catch (e) {
		console.error(`< Error generating types:`, e);
	}
};

void run();
