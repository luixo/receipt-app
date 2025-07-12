import type { BrowserContext, Page } from "@playwright/test";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import {
	type JSONRPC2,
	type TRPCErrorShape,
	TRPC_ERROR_CODES_BY_KEY,
} from "@trpc/server/rpc";
import http from "node:http";
import { fromEntries } from "remeda";
import { v4 } from "uuid";

import type {
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
} from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import type { AccountsId, UsersId } from "~db/models";
import { urlSettings } from "~tests/frontend/consts";
import { CURRENCY_CODES } from "~utils/currency-data";
import { transformer } from "~utils/transformer";
import type { TransformerResult } from "~utils/transformer";
import type { MaybePromise } from "~utils/types";

import type { appRouter } from "../global/router";

import type { ExtendedFaker } from "./mock";
import { mockFixtures as test } from "./mock";

const CLEANUP_MARK = "__CLEANUP_MARK__";

export type TRPCKey = TRPCQueryKey | TRPCMutationKey;

type CleanupFn = () => Promise<void>;

type QueryOrMutationInput<K extends TRPCKey> = K extends TRPCQueryKey
	? TRPCQueryInput<K>
	: K extends TRPCMutationKey
		? TRPCMutationInput<K>
		: void;

type QueryOrMutationOutput<K extends TRPCKey> = K extends TRPCQueryKey
	? TRPCQueryOutput<K>
	: K extends TRPCMutationKey
		? TRPCMutationOutput<K>
		: void;

type QueryOrMutationHandlerOptions<K extends TRPCKey> = {
	input: QueryOrMutationInput<K>;
	calls: number;
	headers: Headers;
	next: () => MaybePromise<QueryOrMutationOutput<K>>;
};

type QueryOrMutationHandler<K extends TRPCKey> =
	| ((
			opts: QueryOrMutationHandlerOptions<K>,
	  ) => MaybePromise<QueryOrMutationOutput<K>>)
	| MaybePromise<QueryOrMutationOutput<K>>;

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
	mockFirst: <K extends TRPCKey>(
		key: K,
		handler: NonNullable<Handlers[K]>[number],
	) => () => void;
	mockLast: <K extends TRPCKey>(
		key: K,
		handler: NonNullable<Handlers[K]>[number],
	) => () => void;
	createPause: () => PromiseWithResolvers<void>;
	getActions: () => Action[];
	clearActions: () => void;
};

type Handlers = Partial<
	{
		[Key in TRPCQueryKey]: QueryOrMutationHandler<Key>[];
	} & {
		[Key in TRPCMutationKey]: QueryOrMutationHandler<Key>[];
	}
>;
type Action<K extends TRPCKey = TRPCKey> = [
	type: CallType,
	name: K,
	input: QueryOrMutationInput<K>,
];

type Controller = {
	handlers: Handlers;
	paused: PromiseWithResolvers<void>[];
	calls: Map<TRPCKey, number>;
	actions: Action[];
};

type CallType = "server" | "client";

const API_PREFIX = "/api/trpc/";

const getHandlersResponse = <K extends TRPCKey>(
	key: K,
	headers: Headers,
	handlers: NonNullable<Handlers[K]>,
	input: QueryOrMutationInput<K>,
	calls: number,
) => {
	if (handlers.length === 0) {
		throw new Error(`No handler for ${key}`);
	}
	const returnAtIndex = (
		index: number,
	): MaybePromise<QueryOrMutationOutput<K>> => {
		const handler = handlers[index] as QueryOrMutationHandler<K>;
		if (typeof handler === "function") {
			return handler({
				input,
				calls,
				headers,
				next: () => {
					if (index === 0) {
						throw new Error(
							`No handler for ${key}, no middleware function below`,
						);
					}
					return returnAtIndex(index - 1);
				},
			});
		}
		return handler;
	};
	return returnAtIndex(handlers.length - 1);
};

const handleCall = async <K extends TRPCKey>(
	controller: Controller,
	headers: Headers,
	type: CallType,
	name: K,
	input: TransformerResult | undefined,
): Promise<JSONRPC2.ResultResponse | JSONRPC2.ErrorResponse> => {
	const deserializedInput: QueryOrMutationInput<K> = input
		? transformer.deserialize(input)
		: (undefined as QueryOrMutationInput<K>);
	controller.actions.push([type, name, deserializedInput]);
	try {
		const handlers = controller.handlers[name] || [];
		const response = await getHandlersResponse(
			name,
			headers,
			handlers,
			deserializedInput,
			controller.calls.get(name) || 0,
		);
		return {
			result: {
				data: transformer.serialize(response),
			},
		};
	} catch (e) {
		const trpcError =
			e instanceof TRPCError
				? e
				: new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Internal server error: ${String(e)}`,
						cause: e,
					});
		if (!(e instanceof TRPCError) && e !== CLEANUP_MARK) {
			// Unexpected error logging in Playwright helps debugging
			// eslint-disable-next-line no-console
			console.error("Internal server error", e);
		}
		return {
			error: transformer.serialize({
				code: TRPC_ERROR_CODES_BY_KEY[trpcError.code],
				data: {
					code: trpcError.code,
					httpStatus: getHTTPStatusCodeFromError(trpcError),
					path: name,
					stack:
						e instanceof TRPCError || e instanceof Error
							? e.stack
							: trpcError.stack,
				},
				message: trpcError.message,
			}) as unknown as TRPCErrorShape,
		};
	} finally {
		controller.calls.set(name, (controller.calls.get(name) || 0) + 1);
	}
};

type MaybeArray<T> = T | T[];

const handleRequest = async (
	controller: Controller,
	headers: Headers,
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
		const inputs = JSON.parse(decodeURIComponent(source)) as Record<
			number,
			TransformerResult
		>;
		const names = cleanPathname.split(",") as TRPCKey[];
		return Promise.all(
			names
				.map((name, index) => ({ name, input: inputs[index] }))
				.map(({ name, input }) =>
					handleCall(controller, headers, type, name, input),
				),
		);
	}
	const input = JSON.parse(decodeURIComponent(source)) as TransformerResult;
	const name = cleanPathname as TRPCKey;
	return handleCall(controller, headers, type, name, input);
};

const createWorkerManager = async (port: number): Promise<WorkerManager> => {
	const controllers: Record<string, Controller> = {};
	const server = http.createServer(async (req, res) => {
		let body = "";
		const jsonPromise = new Promise<string>((resolve) => {
			req.on("data", (chunk: string) => {
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
		const controllerId = url.searchParams.get("controllerId") || undefined;
		if (!controllerId) {
			throw new Error(
				`Expected to have controller id for url "${url.toString()}"`,
			);
		}
		const controller = controllers[controllerId];
		if (!controller) {
			throw new Error(`Expected to have controller for id "${controllerId}"`);
		}
		const headers = new Headers();
		try {
			const response = await handleRequest(
				controller,
				headers,
				"server",
				url.searchParams.has("batch"),
				url,
				req.method || "GET",
				() => jsonPromise,
			);
			if (!res.headersSent) {
				res.setHeaders(headers);
			}
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
				server.listen(port, resolve);
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
				paused: [],
				calls: new Map(),
			};
			controllers[id] = controller;
			return {
				controller,
				cleanup: async () => {
					controller.paused.forEach((controllerPromise) => {
						controllerPromise.reject(CLEANUP_MARK);
					});
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
		const headers = new Headers();
		const url = new URL(request.url());
		try {
			const response = await handleRequest(
				controller,
				headers,
				"client",
				url.searchParams.has("batch"),
				url,
				request.method(),
				async () => request.postData() || "{}",
			);
			await route.fulfill({
				json: response,
				headers: fromEntries([...headers.entries()]),
			});
		} catch (e) {
			if (e === CLEANUP_MARK) {
				await route.abort();
				return;
			}
			throw e;
		}
	});
	const mock = <K extends TRPCKey>(
		key: K,
		handler: NonNullable<Handlers[K]>[number],
		type: "append" | "prepend",
	) => {
		const handlers =
			controller.handlers[key] || ([] as NonNullable<Handlers[typeof key]>);
		if (type === "append") {
			// @ts-expect-error: A very complex type to represent
			handlers.push(handler);
		} else {
			// @ts-expect-error: A very complex type to represent
			handlers.unshift(handler);
		}
		controller.handlers[key] = handlers;
		return () => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			controller.handlers[key] = controller.handlers[key]!.filter(
				(lookupHandler) => lookupHandler !== handler,
			) as (typeof controller)["handlers"][typeof key];
		};
	};
	return {
		mockFirst: (key, handler) => mock(key, handler, "append"),
		mockLast: (key, handler) => mock(key, handler, "prepend"),
		createPause: () => {
			// Our version is ^22.0.0 which means we usually get `withResolvers`.
			// eslint-disable-next-line n/no-unsupported-features/es-syntax
			const promise = Promise.withResolvers<void>();
			controller.paused.push(promise);
			return promise;
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

const getMockUtils = (api: ApiManager, faker: ExtendedFaker) => ({
	noAuthPage: () => {
		api.mockLast("currency.getList", CURRENCY_CODES);
		api.mockLast("account.get", () => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "No token provided - mocked",
			});
		});
	},
	authPage: async ({ page }: { page: Page }) => {
		await page.context().addCookies([
			{
				name: AUTH_COOKIE,
				value: "fake-test-auth-cookie",
				url: urlSettings.baseUrl,
			},
		]);
		api.mockLast("currency.getList", CURRENCY_CODES);
		api.mockLast("debtIntentions.getAll", []);
		api.mockLast("accountConnectionIntentions.getAll", {
			inbound: [],
			outbound: [],
		});
		const selfId = faker.string.uuid();
		const selfUser = {
			id: selfId as UsersId,
			name: faker.person.firstName(),
			publicName: undefined,
			connectedAccount: {
				id: selfId as AccountsId,
				email: faker.internet.email(),
				avatarUrl: undefined,
			},
		};
		const selfAccount = {
			id: selfUser.connectedAccount.id,
			email: selfUser.connectedAccount.email,
			verified: true,
			avatarUrl: selfUser.connectedAccount.avatarUrl,
			role: undefined,
		};
		api.mockLast("account.get", {
			account: selfAccount,
			user: { name: selfUser.name },
		});
		api.mockLast("accountSettings.get", { manualAcceptDebts: false });
		api.mockLast("users.get", ({ input, next }) =>
			selfUser.id === input.id ? selfUser : next(),
		);
		return { user: selfUser, account: selfAccount };
	},
	mockUsers: (...users: TRPCQueryOutput<"users.get">[]) => {
		api.mockFirst(
			"users.get",
			({ input, next }) => users.find((user) => user.id === input.id) || next(),
		);
	},
});

type ApiFixtures = {
	api: ApiManager & {
		mockUtils: ReturnType<typeof getMockUtils>;
	};
};

type ApiWorkerFixture = {
	globalApiManager: WorkerManager;
};

export const apiFixtures = test.extend<ApiFixtures, ApiWorkerFixture>({
	api: [
		async ({ globalApiManager, context, faker }, use) => {
			const { cleanup, ...api } = await createApiManager(
				globalApiManager,
				context,
			);
			await use({ ...api, mockUtils: getMockUtils(api, faker) });
			await cleanup();
		},
		{ auto: true },
	],
	globalApiManager: [
		async ({}, use) => {
			const managerPort = process.env.MANAGER_PORT;
			const client = createTRPCClient<typeof appRouter>({
				links: [
					httpBatchStreamLink({
						transformer,
						url: `http://localhost:${managerPort}`,
					}),
				],
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
