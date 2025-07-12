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

import type { TemporalType } from "~utils/date";
import {
	isTemporalObject,
	localTimeZone,
	parsers,
	serialize,
} from "~utils/date";

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

/* c8 ignore start */

type BuiltinType = Exclude<
	(typeof types.builtins)[keyof typeof types.builtins],
	string
>;
type TypeParser = (input: string) => unknown;
type TemporalBuiltinType =
	| typeof types.builtins.DATE
	| typeof types.builtins.TIMESTAMP
	| typeof types.builtins.TIMESTAMPTZ
	| typeof types.builtins.TIME
	| typeof types.builtins.TIMETZ;
const temporalMapping = {
	[types.builtins.DATE]: "plainDate",
	[types.builtins.TIMESTAMP]: "plainDateTime",
	[types.builtins.TIMESTAMPTZ]: "zonedDateTime",
	[types.builtins.TIME]: "plainDate",
	// This is incorrect, but we don't use timetz type
	[types.builtins.TIMETZ]: "plainTime",
} satisfies Record<TemporalBuiltinType, TemporalType>;
export const temporalParsers = mapValues(
	temporalMapping,
	() => (input: string) => input,
);
const dbParsers: Partial<Record<BuiltinType, TypeParser>> = {
	...temporalParsers,
	[types.builtins.BOOL]: (value) => (value === "t" ? "true" : "false"),
	/* c8 ignore stop */
};
const calendarISOToDatabaseISO = (input: string) =>
	input.replace("T", " ").replace(/\[.*\]$/, "");
const serializer: Serializer = (input) => {
	if (isTemporalObject(input)) {
		return calendarISOToDatabaseISO(serialize(input));
	}
	return defaultSerializer(input);
};
const deserializeRegexes = {
	plainDate: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
	plainTime: /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
	plainDateTime:
		/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
	zonedDateTime:
		/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.[0-9]{1,6})?(?:Z|-0[1-9]|-1\d|-2[0-3]|-00:?(?:0[1-9]|[1-5]\d)|\+[01]\d|\+2[0-3])(?:|:?[0-5]\d)$/,
} satisfies Record<TemporalType, RegExp>;
const databaseISOToCalendarISO = (input: string, addTimezone?: boolean) => {
	const separatedInput = input.replace(" ", "T");
	return addTimezone ? `${separatedInput}[${localTimeZone}]` : separatedInput;
};
const deserializer: Deserializer = (input) => {
	if (input === null) {
		return null;
	}
	if (Array.isArray(input)) {
		return input.map((element) => deserializer(element));
	}
	if (typeof input === "string") {
		const regexTypeMatch = entries(deserializeRegexes).find(([, regex]) =>
			regex.test(input),
		);
		if (regexTypeMatch) {
			const type = regexTypeMatch[0];
			return parsers[type](
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				databaseISOToCalendarISO(input, type.startsWith("zoned")) as any,
			);
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
	getTypeParser?: GetTypeParser;
	serialization?: {
		serialize?: Serializer;
		deserialize?: Deserializer;
	} | null;
} & Omit<PoolConfig, "connectionString">;
type GetTypeParser = (oid: BuiltinType) => undefined | TypeParser;
const getCustomTypes = (getTypeParser: GetTypeParser): typeof types => ({
	// @ts-expect-error Complicated function override types
	getTypeParser: (oid, format) => {
		const parser = getTypeParser(oid);
		return parser || types.getTypeParser(oid, format as "text");
	},
});
const customizedTypes: typeof types = getCustomTypes((oid) => dbParsers[oid]);
const sharedPools: Partial<Record<string, Pool>> = {};
export const getDatabase = ({
	logger,
	connectionString,
	sharedKey,
	getTypeParser: customGetTypeParser,
	serialization,
	...props
}: DatabaseOptions) => {
	const pool =
		(sharedKey && sharedPools[sharedKey]) ||
		new Pool({
			connectionString,
			/* c8 ignore start */
			types: customGetTypeParser
				? getCustomTypes(customGetTypeParser)
				: customizedTypes,
			/* c8 ignore stop */
			...props,
		});
	if (sharedKey) {
		sharedPools[sharedKey] = pool;
	}
	pool.on("remove", () => {
		delete sharedPools[connectionString];
	});
	return new Kysely<ReceiptsDatabase>({
		dialect: new PostgresDialect({ pool }),
		log: logger && getLogger(logger),
		/* c8 ignore start */
		plugins:
			serialization === null
				? undefined
				: [
						new SerializePlugin({
							serializer: serialization?.serialize || serializer,
							deserializer: serialization?.serialize || deserializer,
						}),
					],
		/* c8 ignore stop */
	});
};
