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

import type { DB } from "~db/types.gen";
import type { TemporalType } from "~utils/date";
import { isTemporalObject, parsers, serialize } from "~utils/date";

export type Database = Kysely<DB>;

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
	| typeof types.TypeId.DATE
	| typeof types.TypeId.TIMESTAMP
	| typeof types.TypeId.TIMESTAMPTZ
	| typeof types.TypeId.TIME
	| typeof types.TypeId.TIMETZ;
const temporalMapping = {
	[types.builtins.DATE as typeof types.TypeId.DATE]: "plainDate",
	[types.builtins.TIMESTAMP as typeof types.TypeId.TIMESTAMP]: "plainDateTime",
	[types.builtins.TIMESTAMPTZ as typeof types.TypeId.TIMESTAMPTZ]:
		"zonedDateTime",
	[types.builtins.TIME as typeof types.TypeId.TIME]: "plainDate",
	// This is incorrect, but we don't use timetz type
	[types.builtins.TIMETZ as typeof types.TypeId.TIMETZ]: "plainTime",
} satisfies Record<TemporalBuiltinType, TemporalType>;
export const temporalParsers = mapValues(
	temporalMapping,
	() => (input: string) => input,
);
const dbParsers: Partial<Record<BuiltinType, TypeParser>> = {
	...temporalParsers,
	[types.builtins.BOOL as typeof types.TypeId.BOOL]: (value) =>
		value === "t" ? "true" : "false",
	[types.builtins.INT8 as typeof types.TypeId.INT8]: Number,
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
	if (addTimezone) {
		const match = /[-+]\d\d(:\d\d)?$/.exec(input);
		/* c8 ignore start */
		if (match) {
			const isUTC = match[0] === "+00" || match[0] === "+00:00";
			// Removing this hack will create a mismatch between data from DB and expected results
			// Data from DB will have `+00` timezone while expected timestamp will have `UTC` timezone
			return `${separatedInput}[${isUTC ? "UTC" : match[0]}]`;
		}
		/* c8 ignore stop */
	}
	return separatedInput;
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
				// oxlint-disable-next-line typescript/no-explicit-any typescript/no-unsafe-argument
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
// @ts-expect-error Complicated function override types
const getCustomTypes = (getTypeParser: GetTypeParser): typeof types => ({
	getTypeParser: (oid, format) => {
		const parser = getTypeParser(oid);
		// oxlint-disable-next-line typescript/no-unsafe-return
		return parser || types.getTypeParser(oid, format);
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
	return new Kysely<DB>({
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
