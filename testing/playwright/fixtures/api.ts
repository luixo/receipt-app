import type { BrowserContext, Page } from "@playwright/test";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import type { JSONRPC2, TRPCErrorShape } from "@trpc/server/rpc";
import http from "node:http";
import { fromEntries } from "remeda";
import { v4 } from "uuid";

import type {
	TRPCKey,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCQueryOutput,
} from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import type { AccountId, UserId } from "~db/ids";
import { urlSettings } from "~tests/frontend/consts";
import type { ExtendedFaker } from "~tests/utils/faker";
import { CURRENCY_CODES } from "~utils/currency-data";
import { apiCookieNames } from "~utils/mocks";
import { promisifyEvent, promisifyServer } from "~utils/promise";
import { transformer } from "~utils/transformer";
import type { TransformerResult } from "~utils/transformer";
import type { MaybePromise } from "~utils/types";
import { getCookie } from "~web/utils/cookies";

import type { appRouter } from "../global/router";

import { mockFixtures as test } from "./mock";

const CLEANUP_MARK = "__CLEANUP_MARK__";

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
	signal: AbortSignal;
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
	} catch (error) {
		const trpcError =
			error instanceof TRPCError
				? error
				: new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Internal server error: ${String(error)}`,
						cause: error,
					});
		if (!(error instanceof TRPCError) && error !== CLEANUP_MARK) {
			// Unexpected error logging in Playwright helps debugging
			// oxlint-disable-next-line no-console
			console.error("Internal server error", error);
		}
		return {
			error: transformer.serialize({
				code: TRPC_ERROR_CODES_BY_KEY[trpcError.code],
				data: {
					code: trpcError.code,
					httpStatus: getHTTPStatusCodeFromError(trpcError),
					path: name,
					stack:
						error instanceof TRPCError || error instanceof Error
							? error.stack
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
	getBody: () => Promise<string | undefined>,
): Promise<MaybeArray<JSONRPC2.ResultResponse | JSONRPC2.ErrorResponse>> => {
	const rawBody =
		method === "GET"
			? (url.searchParams.get("input") ?? undefined)
			: await getBody();
	const cleanPathname = url.pathname.replace(API_PREFIX, "");
	if (isBatch) {
		const inputs = JSON.parse(decodeURIComponent(rawBody || "{}")) as Record<
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
	const input =
		rawBody === undefined
			? undefined
			: (JSON.parse(decodeURIComponent(rawBody)) as TransformerResult);
	const name = cleanPathname as TRPCKey;
	return handleCall(controller, headers, type, name, input);
};

const createWorkerManager = (port: number): WorkerManager => {
	const controllers: Record<string, Controller> = {};
	const server = promisifyServer(
		// oxlint-disable-next-line typescript/strict-void-return
		http.createServer(async (req, res) => {
			const jsonPromise = promisifyEvent<string>((listener, errorListener) => {
				let body = "";
				const dataListener = (chunk: string) => {
					body += chunk;
				};
				const doneListener = () => listener(body);
				req.on("data", dataListener);
				req.on("error", errorListener);
				req.on("end", doneListener);
				return () => {
					req.off("data", dataListener);
					req.off("error", errorListener);
					req.off("end", doneListener);
				};
			});
			res.writeHead(200, {
				"Content-Type": "application/json",
			});
			const url = new URL(req.url || "/", "http://localhost");
			const headers = new Headers();
			try {
				const controllerId = getCookie(
					req.headers.cookie || "",
					apiCookieNames.controllerId,
				);
				if (!controllerId || Array.isArray(controllerId)) {
					throw new Error(
						`Expected to have controller id for url "${url.toString()}"`,
					);
				}
				const controller = controllers[controllerId];
				if (!controller) {
					throw new Error(
						`Expected to have controller for id "${controllerId}"`,
					);
				}
				if (controller.signal.aborted) {
					// oxlint-disable-next-line eslint-js/no-throw-literal, typescript/only-throw-error
					throw CLEANUP_MARK;
				}
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
			} catch (error) {
				if (error === CLEANUP_MARK) {
					// oxlint-disable-next-line no-param-reassign
					res.statusCode = 500;
					res.end("Cleanup finished");
					return;
				}
				throw error;
			}
		}),
	);

	return {
		getPort: () => port,
		start: async () => {
			await server.listen(port);
			return () => server.close();
		},
		createController: (id: string) => {
			const abortController = new AbortController();
			const controller: Controller = {
				actions: [],
				handlers: {},
				paused: [],
				calls: new Map(),
				signal: abortController.signal,
			};
			controllers[id] = controller;
			return {
				controller,
				cleanup: () => {
					abortController.abort();
					for (const controllerPromise of controller.paused) {
						controllerPromise.reject(CLEANUP_MARK);
					}
					return Promise.resolve();
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
				() => {
					// multipart/form-data bodies can't be parsed as JSON; return
					// undefined so handleRequest passes undefined input to the mock.
					const contentType = request.headers()["content-type"] ?? "";
					if (contentType.startsWith("multipart/form-data")) {
						return Promise.resolve(undefined);
					}
					return Promise.resolve(request.postData() ?? undefined);
				},
			);
			await route.fulfill({
				json: response,
				headers: fromEntries([...headers.entries()]),
			});
		} catch (error) {
			if (error === CLEANUP_MARK) {
				await route.abort();
				return;
			}
			throw error;
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
			// oxlint-disable-next-line typescript/no-non-null-assertion
			controller.handlers[key] = controller.handlers[key]!.filter(
				(lookupHandler) => lookupHandler !== handler,
			) as (typeof controller)["handlers"][typeof key];
		};
	};
	return {
		mockFirst: (key, handler) => mock(key, handler, "append"),
		mockLast: (key, handler) => mock(key, handler, "prepend"),
		createPause: () => {
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
		const unmockCurrency = api.mockLast("currency.getList", CURRENCY_CODES);
		const unmockAccount = api.mockLast("account.get", () => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "No token provided - mocked",
			});
		});
		const unmockReceipts = api.mockLast("receipts.getPaged", {
			items: [],
			cursor: 0,
			count: 0,
		});
		return {
			unmockCurrency,
			unmockAccount,
			unmockReceipts,
		};
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
			id: selfId as UserId,
			name: faker.person.firstName(),
			publicName: undefined,
			connectedAccount: {
				id: selfId as AccountId,
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
		api.mockLast("users.get", ({ input, next }) => {
			if (selfUser.id === input.id) {
				return selfUser;
			}
			return next();
		});
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
			await context.close();
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
			const workerManager = createWorkerManager(port);
			const cleanup = await workerManager.start();
			await client.release.mutate({ hash });
			await use(workerManager);
			await cleanup();
		},
		{ auto: true, scope: "worker" },
	],
});
