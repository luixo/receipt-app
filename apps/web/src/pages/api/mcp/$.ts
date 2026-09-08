import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";
import { fold, zx } from "@traversable/zod";
import type {
	Procedure,
	ProcedureType,
} from "@trpc/server/unstable-core-do-not-import";
import { entries } from "remeda";
import z from "zod";

import type { TRPCKey, TRPCMutationKey, TRPCQueryKey } from "~app/trpc";
import { getNow, isoInputSchemas, temporalSchemas } from "~utils/date";
import { transformer } from "~utils/transformer";
import { router as appRouter } from "~web/handlers";
import type { HandlerMeta } from "~web/handlers/context";
import { adminProcedure, authProcedure } from "~web/handlers/trpc";
import { createContext } from "~web/pages/api/trpc/$";
import { env } from "~web/utils/env";

export type ProcedureInfo = {
	path: string;
	type: "query" | "mutation" | "subscription";
	auth: "none" | "auth" | "admin";
	title: string;
	description: string;
	input?: z.ZodType;
	call: (request: Request, input: unknown) => Promise<unknown>;
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
	"account.changeAvatar",
	"account.resendEmail",
	"account.changePassword",
	"account.logout",
	"auth.confirmEmail",
	"auth.login",
	"auth.register",
	"auth.resetPassword",
	"auth.voidAccount",
	"utils.ping",
	"utils.pingCache",
	"sessions.cleanup",
]);

// Falls back to a placeholder that matches no real session (every
// auth-required call then fails with "Session id mismatch") when
// MCP_SESSION_TOKEN isn't configured.
const STATIC_SESSION_ID =
	env.MCP_SESSION_TOKEN ?? "a69b47fc-6401-4137-978d-f361d3f79f00";

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

const mapProcedures = (router: typeof appRouter): ProcedureInfo[] =>
	entries(router._def.procedures).map((entry) => {
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
			call: async (request: Request, input: unknown) => {
				const context = createContext(request);
				const botUserId = request.headers.get("X-Bot-User-Id");
				const botSession = botUserId
					? await context.database
							.selectFrom("sessions")
							.where((eb) =>
								eb("botUserId", "=", botUserId).and(
									"expirationTimestamp",
									">",
									getNow.zonedDateTime(),
								),
							)
							.select("sessionId")
							.limit(1)
							.executeTakeFirst()
					: undefined;
				request.headers.append(
					"Cookie",
					`authToken=${botSession?.sessionId ?? STATIC_SESSION_ID}`,
				);
				const ctx = {
					...context,
					reqHeaders: request.headers,
					// We'll not use this
					resHeaders: new Headers(),
				};
				try {
					const result = await procedure({
						ctx,
						getRawInput: () => Promise.resolve(input),
						input,
						path,
						type: procedure._def.type,
						signal: request.signal,
					});
					return transformer.serialize(result).json;
				} catch (error) {
					// oxlint-disable-next-line no-console
					console.log("MCP Server error", error);
					throw error;
				}
			},
		};
	});

// oxlint-enable no-underscore-dangle
const registerTools = (
	server: McpServer,
	request: Request,
	procedures: ProcedureInfo[],
) => {
	server.registerTool(
		"list-api-procedures",
		{
			description:
				"List all available tRPC API procedures with their path, type (query/mutation), auth level, forbiddance (allowed only in the app), description, and input schema. Optionally filter by router name.",
			inputSchema: {
				filter: z
					.string()
					.optional()
					.describe(
						"Filter by router name (e.g. 'receipts', 'debts', 'users')",
					),
			},
		},
		({ filter }) => {
			if (filter) {
				const filteredProcedures = procedures.filter(({ path }) =>
					path.startsWith(filter),
				);
				if (filteredProcedures.length === 0) {
					return {
						content: [
							{
								type: "text" as const,
								text: `No procedures found for filter "${filter}". Available routes: ${filteredProcedures.map(({ path }) => path).join(", ")}`,
							},
						],
					};
				}
			}
			return {
				content: [
					{ type: "text" as const, text: JSON.stringify(procedures, null, 2) },
				],
			};
		},
	);

	for (const procedure of procedures) {
		if (procedure.forbidden) {
			continue;
		}
		server.registerTool(
			procedure.path.replaceAll(".", "_"),
			{
				title: procedure.title,
				description: procedure.description,
				inputSchema: procedure.input,
			},
			async (input) => {
				try {
					const result = await procedure.call(request, input);
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(result, null, 2),
							},
						],
						...(result && typeof result === "object"
							? { structuredContent: result as Record<string, unknown> }
							: {}),
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text" as const,
								text: `Error: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
						isError: true,
					};
				}
			},
		);
	}
};

// Stateless: a fresh server + transport per request, matching how the rest
// of the API is stateless per-request rather than holding long-lived state.
const handleMcpRequest = async (request: Request) => {
	const server = new McpServer({ name: "receipt-app-mcp", version: "0.0.1" });
	registerTools(server, request, mapProcedures(appRouter));
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});
	await server.connect(transport);
	return transport.handleRequest(request);
};

export const Route = createFileRoute("/api/mcp/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleMcpRequest(request),
			POST: ({ request }) => handleMcpRequest(request),
		},
	},
});
