import { ColumnType, Kysely, PostgresDialect, SelectExpression } from "kysely";
import { TableExpressionDatabase } from "kysely/dist/cjs/parser/table-parser";
import { Context } from "../handlers/context";
import { getDatabaseConfig } from "./config";
import { InitializerTypeMap, ModelTypeMap } from "./models";

type TableColumnType<WriteTable, ReadTable extends WriteTable> = Required<{
	[C in keyof WriteTable]: ColumnType<
		ReadTable[C],
		WriteTable[C],
		WriteTable[C]
	>;
}>;

type DatabaseColumnType<WriteDatabase, ReadDatabase extends WriteDatabase> = {
	[TB in keyof WriteDatabase]: TableColumnType<
		WriteDatabase[TB],
		ReadDatabase[TB]
	>;
};

export type ReceiptsDatabase = DatabaseColumnType<
	InitializerTypeMap,
	ModelTypeMap
>;

export type ReceiptsSelectExpression<TB extends keyof ReceiptsDatabase> =
	SelectExpression<TableExpressionDatabase<ReceiptsDatabase, TB>, TB>;

const databaseConfig = getDatabaseConfig();
export type Database = Kysely<ReceiptsDatabase>;
export const getDatabase = (ctx?: Context) => {
	return new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect(databaseConfig),
	});
};
