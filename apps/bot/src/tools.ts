import { toolDefinition } from "@tanstack/ai";
import { fold, zx } from "@traversable/zod";
import { getUntypedClient } from "@trpc/client";
import type {
	Procedure,
	ProcedureType,
} from "@trpc/server/unstable-core-do-not-import";
import { serialize } from "cookie";
import { entries, mapValues } from "remeda";
import z from "zod";

import type { TRPCKey, TRPCMutationKey, TRPCQueryKey } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import type { SessionId } from "~db/ids";
import type { TemporalMapping } from "~utils/temporal";
import { temporalClasses, temporalSchemas } from "~utils/temporal";
import { transformer } from "~utils/transformer";
import { router as appRouter } from "~web/handlers";
import type { HandlerMeta } from "~web/handlers/context";
import { adminProcedure, authProcedure } from "~web/handlers/trpc";
import { getServerTrpcClient } from "~web/utils/trpc";

import { env } from "./env";

type ToolContext = { sessionId: SessionId };

type ProcedureInfo = {
	path: string;
	type: "query" | "mutation" | "subscription";
	auth: "none" | "auth" | "admin";
	title: string;
	description: string;
	input?: z.ZodType;
	forbidden: boolean;
};

type TypedProcedure = Procedure<
	ProcedureType,
	{ meta: HandlerMeta; input: unknown; output: unknown }
>;

// oxlint-disable no-underscore-dangle
const [authMiddleware] = authProcedure._def.middlewares;
const [adminMiddleware] = adminProcedure._def.middlewares;
const getAuthLevel = (procedure: TypedProcedure) => {
	// @ts-expect-error It has middlewares, types are wrong
	// oxlint-disable-next-line typescript/no-unsafe-assignment
	const [firstMiddleware] = procedure._def.middlewares;
	if (adminMiddleware === firstMiddleware) {
		return "admin";
	}
	if (authMiddleware === firstMiddleware) {
		return "auth";
	}
	return "none";
};

const forbiddenHandlers = new Set<TRPCKey>([
	"user.changeAvatar",
	"user.resendEmail",
	"user.changePassword",
	"user.logout",
	"auth.confirmEmail",
	"auth.login",
	"auth.register",
	"auth.resetPassword",
	"auth.voidUser",
	"utils.ping",
	"sessions.cleanup",
]);

const isoInputShapes = {
	plainDate: z.iso.date(),
	plainTime: z.iso.time({ precision: 3 }),
	plainDateTime: z.iso.datetime({ local: true, precision: 3 }),
	zonedDateTime: z.string().meta({
		description: "ISO 8601 date-time including an IANA time-zone annotation",
		examples: ["2026-09-05T12:30:00.000+00:00[UTC]"],
	}),
} satisfies Record<keyof TemporalMapping, z.ZodType>;

const isoInputSchemas = mapValues(isoInputShapes, (inputSchema, key) =>
	z.codec(inputSchema, temporalSchemas[key], {
		decode: (input) => temporalClasses[key].from(input),
		encode: (value) => value.toString(),
	}),
) as {
	[K in keyof TemporalMapping]: z.ZodCodec<
		(typeof isoInputShapes)[K],
		(typeof temporalSchemas)[K]
	>;
};

const replacements = new Map<z.ZodType, z.ZodType>(
	entries(temporalSchemas).map(([key, schema]) => [
		schema,
		isoInputSchemas[key],
	]),
);

const replaceSchema = fold<z.ZodType>((untypedInput) => {
	const input = untypedInput as unknown as z.ZodType;
	switch (true) {
		case zx.tagged("custom")(input): {
			const replacement = replacements.get(input);
			if (!replacement) {
				throw new Error(
					"Expected to have a replacement for a given custom input",
				);
			}
			return z.clone(replacement, replacement._zod.def);
		}
		default:
			return z.clone(input, input._zod.def);
	}
});

const procedures: ProcedureInfo[] = entries(appRouter._def.procedures).map(
	(entry) => {
		const [path, procedure] = entry as unknown as [
			TRPCQueryKey | TRPCMutationKey,
			TypedProcedure,
		];
		const [inputSchema] = procedure._def.inputs;
		return {
			path,
			type: procedure._def.type,
			auth: getAuthLevel(procedure),
			title: procedure.meta.title,
			description: procedure.meta.description,
			input:
				forbiddenHandlers.has(path) || !inputSchema
					? undefined
					: replaceSchema(inputSchema as unknown as z.ZodType),
			forbidden: forbiddenHandlers.has(path),
		};
	},
);
// oxlint-enable no-underscore-dangle

const clientFor = (sessionId: SessionId) =>
	getUntypedClient(
		getServerTrpcClient({
			url: env.WEB_BASE_URL,
			source: "bot",
			headers: { Cookie: serialize(AUTH_COOKIE, sessionId) },
		}),
	);

export const listApiProcedures = toolDefinition({
	name: "list-api-procedures",
	description:
		"List all tRPC API procedures, including their path, type, auth level, forbiddance, description and input schema. Optionally filter by router name.",
	inputSchema: z.strictObject({
		filter: z
			.string()
			.optional()
			.describe("Router name, e.g. receipts or debts"),
	}),
}).server(({ filter }) => {
	const matches = filter
		? procedures.filter(({ path }) => path.startsWith(filter))
		: procedures;
	return matches.map(({ input, ...procedure }) => ({
		...procedure,
		inputSchema: input ? z.toJSONSchema(input, { io: "input" }) : undefined,
	}));
});

const procedureTools = procedures
	.filter(({ forbidden, type }) => !forbidden && type !== "subscription")
	.map((procedure) =>
		toolDefinition({
			name: procedure.path.replaceAll(".", "_"),
			description: procedure.description,
			inputSchema: procedure.input,
		}).server<ToolContext>(async (input, { context, abortSignal }) => {
			const client = clientFor(context.sessionId);
			const options = { signal: abortSignal };
			const result =
				procedure.type === "mutation"
					? await client.mutation(procedure.path, input, options)
					: await client.query(procedure.path, input, options);
			return transformer.serialize(result).json;
		}),
	);

export const tools = [listApiProcedures, ...procedureTools];
