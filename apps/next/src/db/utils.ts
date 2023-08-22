import type { Database } from "next-app/db";

const MOCK_TABLE_NAME = "debts";

export const getSchema = (database: Database) => {
	const { sql } = database.selectFrom(MOCK_TABLE_NAME).selectAll().compile();
	const match = sql.match(
		new RegExp(`select \\* from "(.*)"\\."${MOCK_TABLE_NAME}"`),
	);
	if (match) {
		return match[1];
	}
};

export const tableWithSchema = (database: Database, tableName: string) => {
	const schema = getSchema(database);
	if (!schema) {
		return `"${tableName}"`;
	}
	return `"${schema}"."${tableName}"`;
};
