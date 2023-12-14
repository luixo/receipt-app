import type { BrowserContext } from "@playwright/test";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import {
	type JSONRPC2,
	type TRPCErrorShape,
	TRPC_ERROR_CODES_BY_KEY,
} from "@trpc/server/rpc";
import http from "node:http";
import { v4 } from "uuid";

import type {
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
} from "app/trpc";
import type { Currency, CurrencyCode } from "app/utils/currency";
import type { TransformerResult } from "app/utils/trpc";
import { transformer } from "app/utils/trpc";
import type { ControlledPromise } from "app/utils/utils";
import { createPromise } from "app/utils/utils";
import { getCurrencies } from "next-app/utils/currency";

import type { appRouter } from "../global/router";

import { createMixin } from "./utils";

const CLEANUP_MARK = "__CLEANUP_MARK__";

export type TRPCKey = TRPCQueryKey | TRPCMutationKey;

type QueryHandlers = {
	[Key in TRPCQueryKey]:
		| ((input: TRPCQueryInput<Key>) => TRPCQueryOutput<Key>)
		| TRPCQueryOutput<Key>;
};
type MutationHandlers = {
	[Key in TRPCMutationKey]:
		| ((input: TRPCMutationInput<Key>) => TRPCMutationOutput<Key>)
		| TRPCMutationOutput<Key>;
};

type CleanupFn = () => Promise<void>;

type QueryOrMutationInput<K extends TRPCKey> = K extends TRPCQueryKey
	? TRPCQueryInput<K>
	: K extends TRPCMutationKey
	? TRPCMutationInput<K>
	: void;

type WorkerManager = {
	getPort: () => number;
	start: () => Promise<CleanupFn>;
	createController: (id: string) => {
		controller: Controller;
		cleanup: CleanupFn;
	};
};

export type ApiManager = {
	getConnection: () => { port: number; controllerId: string };
	mock: <K extends TRPCKey>(key: K, handler: Handlers[K]) => void;
	pause: <K extends TRPCKey>(key: K) => void;
	unpause: <K extends TRPCKey>(key: K) => void;
	getActions: () => Action[];
	clearActions: () => void;
};

type Handlers = Partial<QueryHandlers & MutationHandlers>;
type Action<K extends TRPCKey = TRPCKey> = [
	type: CallType,
	name: K,
	input: QueryOrMutationInput<K>,
];

type Controller = {
	handlers: Handlers;
	paused: Map<TRPCKey, ControlledPromise>;
	actions: Action[];
};

type CallType = "server" | "client";

const API_PREFIX = "/api/trpc/";

const handleCall = async <K extends TRPCKey>(
	controller: Controller,
	type: CallType,
	name: K,
	input: TransformerResult | undefined,
): Promise<JSONRPC2.ResultResponse | JSONRPC2.ErrorResponse> => {
	const deserializedInput = (
		input ? transformer.deserialize(input) : undefined
	) as QueryOrMutationInput<K>;
	controller.actions.push([type, name, deserializedInput]);
	const pausedPromise = controller.paused.get(name);
	if (pausedPromise) {
		await pausedPromise.wait();
	}
	const handlerOrData = controller.handlers[name];
	if (!handlerOrData) {
		throw new Error(`No handler for ${name}`);
	}
	try {
		return {
			result: {
				data: transformer.serialize(
					typeof handlerOrData === "function"
						? // eslint-disable-next-line @typescript-eslint/no-explicit-any
						  handlerOrData(deserializedInput as any)
						: handlerOrData,
				),
			},
		};
	} catch (e) {
		const trpcError =
			e instanceof TRPCError
				? e
				: new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Internal server error",
						cause: e,
				  });
		return {
			error: transformer.serialize({
				code: TRPC_ERROR_CODES_BY_KEY[trpcError.code],
				data: {
					code: trpcError.code,
					httpStatus: getHTTPStatusCodeFromError(trpcError),
					path: name,
					stack: trpcError.stack,
				},
				message: trpcError.message,
			}) as unknown as TRPCErrorShape,
		};
	}
};

type MaybeArray<T> = T | T[];

const handleRequest = async (
	controller: Controller,
	type: CallType,
	isBatch: boolean,
	url: URL,
	method: string,
	getBody: () => Promise<string>,
): Promise<MaybeArray<JSONRPC2.ResultResponse | JSONRPC2.ErrorResponse>> => {
	const source =
		(method === "GET" ? url.searchParams.get("input") : await getBody()) ||
		"{}";
	const cleanPathname = url.pathname.replace(API_PREFIX, "");
	if (isBatch) {
		const inputs: Record<number, TransformerResult> = JSON.parse(
			decodeURIComponent(source),
		);
		const names = cleanPathname.split(",") as TRPCKey[];
		return Promise.all(
			names
				.map((name, index) => ({ name, input: inputs[index]! }))
				.map(({ name, input }) => handleCall(controller, type, name, input)),
		);
	}
	const input: TransformerResult = JSON.parse(decodeURIComponent(source));
	const name = cleanPathname as TRPCKey;
	return handleCall(controller, type, name, input);
};

const createWorkerManager = async (port: number): Promise<WorkerManager> => {
	const controllers: Record<string, Controller> = {};
	const server = http.createServer(async (req, res) => {
		let body = "";
		const jsonPromise = new Promise<string>((resolve) => {
			req.on("data", (chunk) => {
				body += chunk;
			});
			res.on("end", () => {
				resolve(body);
			});
		});
		res.writeHead(200, {
			"Content-Type": "application/json",
		});
		const url = new URL(req.url || "/", "http://localhost");
		const rawControllerId = req.headers["x-controller-id"];
		const controllerId =
			typeof rawControllerId === "string" ? rawControllerId : undefined;
		if (!controllerId) {
			throw new Error(
				`Expected to have controller id for url "${url.toString()}"`,
			);
		}
		const controller = controllers[controllerId];
		if (!controller) {
			throw new Error(`Expected to have controller for id "${controllerId}"`);
		}
		try {
			const response = await handleRequest(
				controller,
				"server",
				url.searchParams.has("batch"),
				url,
				req.method || "GET",
				() => jsonPromise,
			);
			res.end(JSON.stringify(response));
		} catch (e) {
			if (e === CLEANUP_MARK) {
				res.statusCode = 500;
				res.end("Cleanup finished");
				return;
			}
			throw e;
		}
	});

	return {
		getPort: () => port,
		start: async () => {
			await new Promise<void>((resolve) => {
				server.listen(port, "localhost", resolve);
			});
			return async () => {
				await new Promise<void>((resolve, reject) => {
					server.close((err) => {
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					});
				});
			};
		},
		createController: (id: string) => {
			const controller: Controller = {
				actions: [],
				handlers: {},
				paused: new Map(),
			};
			controllers[id] = controller;
			return {
				controller,
				cleanup: async () => {
					controllers[id]!.paused.forEach((promise) =>
						promise.reject(CLEANUP_MARK),
					);
					delete controllers[id];
				},
			};
		},
	};
};

const createApiManager = async (
	globalManager: WorkerManager,
	context: BrowserContext,
): Promise<ApiManager & { cleanup: CleanupFn }> => {
	const controllerId = v4();
	const { controller, cleanup } = globalManager.createController(controllerId);
	await context.route(`${API_PREFIX}**/*`, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		try {
			const response = await handleRequest(
				controller!,
				"client",
				url.searchParams.has("batch"),
				url,
				request.method(),
				async () => request.postData() || "{}",
			);
			await route.fulfill({ json: response });
		} catch (e) {
			if (e === CLEANUP_MARK) {
				await route.abort();
				return;
			}
			throw e;
		}
	});
	return {
		mock: (key, handler) => {
			controller.handlers[key] = handler;
		},
		pause: (key) => {
			if (controller.paused.has(key)) {
				return;
			}
			controller.paused.set(key, createPromise());
		},
		unpause: (key) => {
			const pausedPromise = controller.paused.get(key);
			if (pausedPromise) {
				pausedPromise.resolve();
				controller.paused.delete(key);
			}
		},
		getActions: () => controller.actions,
		clearActions: () => {
			controller.actions = [];
		},
		getConnection: () => ({
			port: globalManager.getPort(),
			controllerId,
		}),
		cleanup,
	};
};

type Account = TRPCQueryOutput<"account.get">;

const getMockUtils = (api: ApiManager) => {
	const authAnyPage = () => {
		api.mock("receipts.getNonResolvedAmount", () => 0);
		api.mock("debts.getIntentions", () => []);
		api.mock("accountConnectionIntentions.getAll", () => ({
			inbound: [],
			outbound: [],
		}));
	};
	return {
		noAuth: () => {
			api.mock("account.get", () => {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "No token provided - mocked",
				});
			});
		},
		auth: (account: Account | (() => Account)) => {
			api.mock("account.get", account);
			authAnyPage();
		},
		currencyList: (currencies?: Currency[]) => {
			api.mock(
				"currency.getList",
				() =>
					currencies ||
					Object.entries(getCurrencies("en")).map(([code, currency]) => ({
						code: code as CurrencyCode,
						name: currency.name_plural,
						symbol: currency.symbol_native,
					})),
			);
		},
		authAnyPage,
		emptyReceipts: () => {
			api.mock("receipts.getPaged", () => ({
				items: [],
				hasMore: false,
				cursor: -1,
				count: 0,
			}));
		},
	};
};

export type ApiMixin = {
	api: ApiManager & {
		mockUtils: ReturnType<typeof getMockUtils>;
	};
};

type ApiWorkerMixin = {
	globalApiManager: WorkerManager;
};

export const apiMixin = createMixin<ApiMixin, ApiWorkerMixin>({
	api: [
		async ({ globalApiManager, context }, use) => {
			const { cleanup, ...api } = await createApiManager(
				globalApiManager,
				context,
			);
			await use({ ...api, mockUtils: getMockUtils(api) });
			await cleanup();
		},
		{ auto: true },
	],
	globalApiManager: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const managerPort = process.env.MANAGER_PORT;
			const client = createTRPCClient<typeof appRouter>({
				links: [httpBatchLink({ url: `http://localhost:${managerPort}` })],
			});
			const { port, hash } = await client.lockPort.mutate();
			const workerManager = await createWorkerManager(port);
			const cleanup = await workerManager.start();
			await client.release.mutate({ hash });
			await use(workerManager);
			await cleanup();
		},
		{ auto: true, scope: "worker" },
	],
});
