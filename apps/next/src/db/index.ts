import { Kysely, LogEvent, PostgresDialect, SelectExpression } from "kysely";
import { Pool } from "pg";

import { Logger } from "next-app/utils/logger";

import { ReceiptsDatabase } from "./types";

export type ReceiptsSelectExpression<TB extends keyof ReceiptsDatabase> =
	SelectExpression<ReceiptsDatabase, TB>;

export type Database = Kysely<ReceiptsDatabase>;

const getLogger = (logger: Logger) => (logEvent: LogEvent) => {
	const common = {
		sql: logEvent.query.sql.replaceAll(/\$\d+/g, (input) =>
			String(logEvent.query.parameters[Number(input.slice(1))]),
		),
		duration: logEvent.queryDurationMillis,
	};
	if (logEvent.level === "query") {
		logger.debug(common);
	} else {
		logger.error({ ...common, error: logEvent.error });
	}
};

type DatabaseOptions = {
	logger?: Logger;
	pool: Pool;
};
export const getDatabase = ({ logger, pool }: DatabaseOptions) =>
	new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect({ pool }),
		log: logger && getLogger(logger),
	});
