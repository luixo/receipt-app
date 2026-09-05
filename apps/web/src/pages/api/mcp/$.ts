import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestInfo } from "@trpc/server/unstable-core-do-not-import";
import type {
	Procedure,
	ProcedureType,
} from "@trpc/server/unstable-core-do-not-import";
import { toReqRes } from "fetch-to-node";
import { entries } from "remeda";
import z from "zod";

import type { TRPCKey, TRPCMutationKey, TRPCQueryKey } from "~app/trpc";
import { temporalSchemaReplacements, temporalSchemas } from "~utils/date";
import { transformer } from "~utils/transformer";
import { router as appRouter } from "~web/handlers";
import type { HandlerMeta } from "~web/handlers/context";
import { createContext } from "~web/handlers/context";
import { adminProcedure, authProcedure } from "~web/handlers/trpc";
import { createContextRest } from "~web/pages/api/trpc/$";

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
]);

const STATIC_SESSION_ID = "a69b47fc-6401-4137-978d-f361d3f79f00";

const mapProcedures = (router: typeof appRouter): ProcedureInfo[] =>
	entries(router._def.procedures).map((entry) => {
		const [path, procedure] = entry as unknown as [
			TRPCQueryKey | TRPCMutationKey,
			TypedProcedure,
		];
		return {
			path,
			type: procedure._def.type,
			auth: getAuthLevel(procedure),
			title: procedure.meta.title,
			description: procedure.meta.description,
			input: forbiddenHandlers.has(path)
				? undefined
				: (procedure._def.inputs[0] as unknown as z.ZodType),
			forbidden: forbiddenHandlers.has(path),
			call: async (request: Request, input: unknown) => {
				const url = new URL("/api/trpc", "http://localhost");
				request.headers.append("Cookie", `authToken=${STATIC_SESSION_ID}`);
				const { req, res } = toReqRes(request);
				const ctx = createContext(
					{
						info: await getRequestInfo({
							req: request,
							url,
							path: url.pathname.slice(1),
							router,
							searchParams: url.searchParams,
							headers: request.headers,
						}),
						req,
						res,
					},
					createContextRest(request),
				);
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

const invertedTemporalSchema = new Map(
	entries(temporalSchemas).map(([key, value]) => [value, key]),
);

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
			procedure.path,
			{
				title: procedure.title,
				description: procedure.description,
				inputSchema: procedure.input,
				inputSchemaOptions: {
					unrepresentable: (ctx) => {
						const mappedType = invertedTemporalSchema.get(
							ctx.zodSchema as Parameters<
								(typeof invertedTemporalSchema)["get"]
							>[0],
						);
						if (mappedType) {
							return temporalSchemaReplacements[mappedType].toJSONSchema();
						}
						return "throw";
					},
				},
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
						structuredContent: result as Record<string, unknown>,
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
