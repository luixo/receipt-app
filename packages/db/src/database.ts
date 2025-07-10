import type { LogEvent } from "kysely";
import { Kysely, PostgresDialect } from "kysely";
import type { Deserializer } from "kysely-plugin-serialize";
import {
	SerializePlugin,
	defaultDeserializer,
	defaultSerializer,
} from "kysely-plugin-serialize";
import type { PoolConfig } from "pg";
import { Pool, types } from "pg";
import type { Logger } from "pino";
import { entries, isPlainObject, mapValues } from "remeda";

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

const dBTemporalTypes = {
	[types.builtins.DATE]: types.builtins.DATE,
	[types.builtins.TIMESTAMP]: types.builtins.TIMESTAMP,
	[types.builtins.TIMESTAMPTZ]: types.builtins.TIMESTAMPTZ,
	[types.builtins.TIME]: types.builtins.TIME,
	[types.builtins.TIMETZ]: types.builtins.TIMETZ,
};
type DBTemporalType = keyof typeof dBTemporalTypes;
const dbTemporalParsers: Record<
	DBTemporalType,
	(input: string) => { type: DBTemporalType; value: string }
> = {
	/* c8 ignore start */
	[types.builtins.TIME]: (value) => ({ type: types.builtins.TIME, value }),
	[types.builtins.DATE]: (value) => ({ type: types.builtins.DATE, value }),
	[types.builtins.TIMESTAMP]: (value) => ({
		type: types.builtins.TIMESTAMP,
		value,
	}),
	[types.builtins.TIMETZ]: (value) => ({ type: types.builtins.TIMETZ, value }),
	[types.builtins.TIMESTAMPTZ]: (value) => ({
		type: types.builtins.TIMESTAMPTZ,
		value,
	}),
	/* c8 ignore stop */
};
const dbParsers: Record<
	(typeof types.builtins)[number],
	(input: string) => unknown
> = {
	[types.builtins.BOOL]: (value) => (value === "t" ? "true" : "false"),
};
const isDbTemporalObject = (
	input: unknown,
): input is ReturnType<(typeof dbTemporalParsers)[DBTemporalType]> =>
	Boolean(
		isPlainObject(input) &&
			typeof input.type === "number" &&
			dBTemporalTypes[input.type as DBTemporalType],
	);
const deserializer: Deserializer = (input) => {
	if (input === null) {
		return null;
	}
	if (Array.isArray(input)) {
		return input.map((element) => deserializer(element));
	}
	if (isDbTemporalObject(input)) {
		return new Date(input.value);
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
} & Omit<PoolConfig, "connectionString">;
let typeParsersApplied = false;
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
	if (!typeParsersApplied) {
		[...entries(dbTemporalParsers), ...entries(dbParsers)].forEach(
			([type, parser]) =>
				types.setTypeParser<ReturnType<typeof parser>>(Number(type), parser),
		);
		typeParsersApplied = true;
	}
	return new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect({ pool }),
		log: logger && getLogger(logger),
		plugins: [
			new SerializePlugin({
				serializer: defaultSerializer,
				deserializer,
			}),
		],
	});
};
