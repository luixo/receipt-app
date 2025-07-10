import type { LogEvent } from "kysely";
import { Kysely, PostgresDialect } from "kysely";
import type { PoolConfig } from "pg";
import { Pool } from "pg";
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
	connectionString: string;
	sharedKey?: string;
} & Omit<PoolConfig, "connectionString">;
const sharedPools: Partial<Record<string, Pool>> = {};
export const getDatabase = ({
	logger,
	connectionString,
	sharedKey,
	...props
}: DatabaseOptions) => {
	const pool =
		(sharedKey && sharedPools[sharedKey]) ||
		new Pool({ connectionString, ...props });
	if (sharedKey) {
		sharedPools[sharedKey] = pool;
	}
	pool.on("remove", () => {
		delete sharedPools[connectionString];
	});
	return new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect({ pool }),
		log: logger && getLogger(logger),
	});
};
