import type { LogEvent } from "kysely";
import { Kysely, PostgresDialect } from "kysely";
import type { Deserializer, Serializer } from "kysely-plugin-serialize";
import {
	SerializePlugin,
	defaultDeserializer,
	defaultSerializer,
} from "kysely-plugin-serialize";
import type { PoolConfig } from "pg";
import { Pool, types } from "pg";
import type { Logger } from "pino";
import { entries, isPlainObject, mapValues } from "remeda";

import { deserialize, isTemporalObject, serialize } from "~utils/date";

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

const dbParsers: Record<
	(typeof types.builtins)[number],
	(input: string) => unknown
> = {
	/* c8 ignore start */
	[types.builtins.DATE]: (input) => input,
	[types.builtins.TIMESTAMP]: (input) => input,
	[types.builtins.TIMESTAMPTZ]: (input) => input,
	[types.builtins.TIME]: (input) => input,
	[types.builtins.TIMETZ]: (input) => input,
	[types.builtins.BOOL]: (value) => (value === "t" ? "true" : "false"),
	/* c8 ignore stop */
};
const serializer: Serializer = (input) => {
	if (isTemporalObject(input)) {
		return serialize(input);
	}
	return defaultSerializer(input);
};
const deserializer: Deserializer = (input) => {
	if (input === null) {
		return null;
	}
	if (Array.isArray(input)) {
		return input.map((element) => deserializer(element));
	}
	if (typeof input === "string") {
		const deserializedValue = deserialize(input);
		if (deserializedValue) {
			return deserializedValue;
		}
	}
	if (isPlainObject(input)) {
		return mapValues(input, (element) => deserializer(element));
	}
	return defaultDeserializer(input);
};

type DatabaseOptions = {
	logger?: Logger;
	connectionString: string;
	sharedKey?: string;
	skipSerialization?: boolean;
} & Omit<PoolConfig, "connectionString">;
let typeParsersApplied = false;
const sharedPools: Partial<Record<string, Pool>> = {};
export const getDatabase = ({
	logger,
	connectionString,
	sharedKey,
	skipSerialization,
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
	if (!typeParsersApplied) {
		entries(dbParsers).forEach(([type, parser]) =>
			types.setTypeParser<ReturnType<typeof parser>>(Number(type), parser),
		);
		typeParsersApplied = true;
	}
	return new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect({ pool }),
		log: logger && getLogger(logger),
		/* c8 ignore start */
		plugins: skipSerialization
			? undefined
			: /* c8 ignore stop */
				[new SerializePlugin({ serializer, deserializer })],
	});
};
