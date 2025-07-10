import { faker } from "@faker-js/faker";
import { TRPCClientError } from "@trpc/client";
import type { AnyTRPCProcedure, inferProcedureInput } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { entries, pick } from "remeda";
import { beforeEach, describe, expect, vi } from "vitest";
import { z } from "zod/v4";

import { test } from "~tests/backend/utils/test";
import { transformer } from "~utils/transformer";
import type { FlattenObject, UnionToIntersection } from "~utils/types";
import type { UnauthorizedContext } from "~web/handlers/context";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";
import { getServerRouteMethod } from "~web/pages/api/test.utils";
import { baseLogger } from "~web/providers/logger";

import { ServerRoute } from "./$";

const proxySpy = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-start/server", async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import("@tanstack/react-start/server")>()),
	proxyRequest: proxySpy,
}));

const POST = getServerRouteMethod(ServerRoute, "POST");
const GET = getServerRouteMethod(ServerRoute, "GET");

const handleWithError = (
	ctx: UnauthorizedContext,
	procedureName: string,
	callerName: string,
) => {
	const errorMessage = ctx.event.node.req.headers["x-error"];
	if (errorMessage !== undefined) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: String(errorMessage),
		});
	}
	return `${procedureName}, ${callerName}`;
};

const router = t.router({
	query: t.procedure
		.input(z.object({ name: z.string() }))
		.query(({ ctx, input: { name } }) => handleWithError(ctx, "query", name)),
	mutation: t.procedure
		.input(z.object({ name: z.string() }))
		.mutation(({ ctx, input: { name } }) =>
			handleWithError(ctx, "mutation", name),
		),
	authQuery: t.procedure
		.use(async ({ ctx, next }) =>
			next({
				ctx: { ...ctx, auth: { email: ctx.event.node.req.headers["x-email"] } },
			}),
		)
		.query(({ ctx }) => handleWithError(ctx, "authQuery", "anyone")),
	account: t.router({
		get: t.procedure.query(() => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You are not authorized!",
			});
		}),
	}),
	setHeader: t.procedure
		.input(z.object({ name: z.string() }))
		.query(({ ctx, input: { name } }) => {
			ctx.event.node.res.setHeader("x-name", name);
			ctx.event.node.res.setHeader("x-amount", 1);
		}),
});

const serializeInput = (input: object) =>
	JSON.stringify(transformer.serialize(input));

type Procedures = UnionToIntersection<
	FlattenObject<AnyTRPCProcedure, (typeof router)["_def"]["procedures"]>
>;
type Options<P extends keyof Procedures> = {
	procedure: P;
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	searchParams?: Record<string, string>;
} & (undefined extends inferProcedureInput<Procedures[P]>
	? { input?: undefined }
	: { input: inferProcedureInput<Procedures[P]> });
const runRoute = async <K extends keyof Procedures>({
	procedure,
	input,
	method = "GET",
	headers,
	searchParams,
}: Options<K>) => {
	const url = new URL(`http://localhost:3000/${procedure}`);
	if (input && method === "GET") {
		url.searchParams.set("input", serializeInput(input));
	}
	if (searchParams) {
		entries(searchParams).forEach(([key, value]) =>
			url.searchParams.set(key, value),
		);
	}
	const response = await (method === "GET" ? GET : POST)({
		context: undefined,
		pathname: "/api/trpc/$",
		request: new Request(url, {
			method,
			headers: {
				"content-type": "application/json",
				...headers,
			},
			body: method === "POST" && input ? serializeInput(input) : undefined,
		}),
		// @ts-expect-error This is a hack for tests
		router,
	});
	const base = { status: response.status, headers: response.headers };
	if (response.headers.get("content-type")?.includes("application/json")) {
		const json = await response.json();
		return {
			...base,
			json:
				"error" in json
					? new TRPCClientError(json.error.message, { result: json })
					: transformer.deserialize(json.result.data),
			text: "",
		};
	}
	return {
		...base,
		json: undefined,
		text: await response.text(),
	};
};

beforeEach(() => {
	vi.stubEnv("DATABASE_URL", "DATABASE_URL");
	return () => vi.unstubAllEnvs();
});

describe("TRPC endpoint", () => {
	describe("error handling", () => {
		test("errors are logged", async () => {
			const errorMessage = faker.lorem.words();
			const userAgent = faker.internet.userAgent();
			const spy = vi.spyOn(baseLogger, "error");
			await runRoute({
				procedure: "query",
				input: { name: "foo" },
				headers: { "x-error": errorMessage, "user-agent": userAgent },
			});
			expect(spy).toBeCalledTimes(1);
			expect(spy).toHaveBeenLastCalledWith(
				`[BAD_REQUEST] [${userAgent}] query "query": ${errorMessage}`,
			);
		});

		// see https://github.com/trpc/trpc/issues/6157
		test.todo("authorized errors are logged with extra data", async () => {
			const errorMessage = faker.lorem.words();
			const userAgent = faker.internet.userAgent();
			const email = faker.internet.email();
			const spy = vi.spyOn(baseLogger, "error");
			await runRoute({
				procedure: "authQuery",
				headers: {
					"x-error": errorMessage,
					"user-agent": userAgent,
					"x-email": email,
				},
			});
			expect(spy).toBeCalledTimes(1);
			expect(spy).toHaveBeenLastCalledWith(
				`[BAD_REQUEST] [${userAgent}] query "authQuery" (by ${email}): ${errorMessage}`,
			);
		});

		test("some errors are not logged", async () => {
			const spy = vi.spyOn(baseLogger, "error");
			await runRoute({
				procedure: "account.get",
			});
			expect(spy).toBeCalledTimes(0);
		});
	});

	describe("response meta", () => {
		test("response is always 200 even when errored", async () => {
			const name = faker.person.firstName();
			const response = await runRoute({
				procedure: "query",
				input: { name },
				headers: { "x-error": "Any error" },
			});
			expect(response.status).toEqual(200);
		});

		test("response does pass headers through", async () => {
			const name = faker.person.firstName();
			const response = await runRoute({
				procedure: "setHeader",
				input: { name },
			});
			expect(response.headers.get("x-name")).toEqual(name);
			expect(response.headers.get("x-amount")).toEqual("1");
		});
	});

	describe("proxy port", () => {
		test("request is sent via proxy port", async ({ ctx }) => {
			await withTestServer(ctx, router, async ({ url }) => {
				const name = faker.person.firstName();
				await runRoute({
					procedure: "query",
					input: { name },
					searchParams: { proxyPort: new URL(url).port },
				});
				const expectedUrl = new URL(url);
				expectedUrl.pathname = "query";
				expectedUrl.searchParams.set("input", serializeInput({ name }));
				expect(proxySpy).toHaveBeenCalledExactlyOnceWith(
					expectedUrl.toString(),
				);
			});
		});

		test("error if trying to proxy out of test mode", async () => {
			vi.stubEnv("MODE", "not-test");
			const name = faker.person.firstName();
			const response = await runRoute({
				procedure: "query",
				input: { name },
				searchParams: { proxyPort: "1000" },
			});
			expect(response.status).toBe(403);
			expect(response.text).toBe("Proxying is only allowed in test mode");
			vi.unstubAllEnvs();
		});
	});

	describe("success", () => {
		test("query with parameters", async () => {
			const name = faker.person.firstName();
			const response = await runRoute({
				procedure: "query",
				input: { name },
			});
			expect(pick(response, ["status", "json"])).toEqual<
				Partial<typeof response>
			>({
				status: 200,
				json: `query, ${name}`,
			});
		});

		test("mutation with parameters", async () => {
			vi.stubEnv("DATABASE_URL", "DATABASE_URL");
			const name = faker.person.firstName();
			const response = await runRoute({
				method: "POST",
				procedure: "mutation",
				input: { name },
			});
			expect(pick(response, ["status", "json"])).toEqual<
				Partial<typeof response>
			>({
				status: 200,
				json: `mutation, ${name}`,
			});
		});
	});
});
