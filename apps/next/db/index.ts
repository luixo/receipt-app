import { Kysely, PostgresDialect } from "kysely";
import { getDatabaseConfig } from "./config";
import { ModelTypeMap } from "./models";

export const database = new Kysely<ModelTypeMap>({
	dialect: new PostgresDialect(getDatabaseConfig()),
});
