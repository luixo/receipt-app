import type { LogEvent } from "kysely";
import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type { Logger } from "pino";

import type { ReceiptsDatabase } from "./types";

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
