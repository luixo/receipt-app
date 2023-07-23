import { Kysely, LogEvent, PostgresDialect, SelectExpression } from "kysely";
import { Pool } from "pg";

import { UnauthorizedContext } from "next-app/handlers/context";
import { Logger } from "next-app/utils/logger";

import { getDatabaseConfig } from "./config";
import { ReceiptsDatabase } from "./types";

export type ReceiptsSelectExpression<TB extends keyof ReceiptsDatabase> =
	SelectExpression<ReceiptsDatabase, TB>;

const getLogger = (logger: Logger, url: string) => (logEvent: LogEvent) => {
	if (logEvent.level === "query") {
		logger.debug({
			sql: logEvent.query.sql.replaceAll(/\$\d+/g, (input) =>
				String(logEvent.query.parameters[Number(input.slice(1))]),
			),
			url,
			duration: logEvent.queryDurationMillis,
		});
	} else {
		logger.error({
			url,
			error: logEvent.error,
		});
	}
};

const databaseConfig = getDatabaseConfig();
const dialect = new PostgresDialect({
	pool: new Pool(databaseConfig),
});
export type Database = Kysely<ReceiptsDatabase>;
export const getDatabase = (ctx?: UnauthorizedContext) =>
	new Kysely<ReceiptsDatabase>({
		dialect,
		log:
			ctx && ctx.debug
				? getLogger(ctx.logger, ctx.req.url || "unknown")
				: undefined,
	});
