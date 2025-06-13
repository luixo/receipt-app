import { TRPCClientError } from "@trpc/client";
import { isNonNullish } from "remeda";
import { assert, describe, expect } from "vitest";
import { z } from "zod/v4";

import { test } from "~tests/backend/utils/test";
import type { UnauthorizedContext } from "~web/handlers/context";
import { t, unauthProcedure } from "~web/handlers/trpc";
import { getReqHeader } from "~web/utils/headers";

import { queueCallFactory } from "./batch";
import { getClientServer } from "./utils.test";

type Input = {
	id: string;
};

type RawElement = {
	id: string;
	value: string;
};

type Element = {
	id: string;
	modifiedValue: string;
};

const getElements = async (ids: string[]): Promise<RawElement[]> => {
	if (ids.includes("fail-all")) {
		throw new Error("Failed getElements call");
	}
	return ids
		.map((id) => {
			if (id === "miss-element") {
				return null;
			}
			return { id, value: id };
		})
		.filter(isNonNullish)
		.toReversed();
};

const mapElement = (rawElement: RawElement): Element => {
	if (rawElement.id === "fail-single") {
		throw new Error("Failed mapElement call");
	}
	return {
		id: rawElement.id,
		modifiedValue: `m-${rawElement.value}`,
	};
};

const queueElement = queueCallFactory<
	UnauthorizedContext,
	Input,
	ReturnType<typeof mapElement>
>(
	() => async (inputs) => {
		const elements = await getElements(inputs.map((input) => input.id));
		return inputs.map((input) => {
			const element = elements.find(({ id }) => id === input.id);
			if (!element) {
				return new Error("Missing element error");
			}
			try {
				const result = mapElement(element);
				return result;
			} catch (e) {
				return e as Error;
			}
		});
	},
	{
		getKey: (ctx) => getReqHeader(ctx, "x-test-id") ?? "unknown",
	},
);

const router = t.router({
	batch: unauthProcedure
		.input(z.strictObject({ id: z.string() }))
		.query(queueElement),
	ping: unauthProcedure
		.input(z.string())
		.query(({ input }) => ({ pong: input })),
});

describe("batching", () => {
	describe("success", () => {
		test("multiple calls", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: true,
			});
			await withServer(async () => {
				const elements = await Promise.all([
					client.batch.query({ id: "1" }),
					client.batch.query({ id: "2" }),
					client.ping.query("hello world"),
				]);
				expect(elements).toEqual<typeof elements>([
					{ id: "1", modifiedValue: "m-1" },
					{ id: "2", modifiedValue: "m-2" },
					{ pong: "hello world" },
				]);
			});
		});

		test("single call", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: true,
			});
			await withServer(async () => {
				const elements = await Promise.all([
					client.batch.query({ id: "1" }),
					client.ping.query("hello world"),
				]);
				expect(elements).toEqual<typeof elements>([
					{ id: "1", modifiedValue: "m-1" },
					{ pong: "hello world" },
				]);
			});
		});

		test("no batch", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: false,
			});
			await withServer(async () => {
				const elements = await Promise.all([
					client.batch.query({ id: "1" }),
					client.batch.query({ id: "2" }),
				]);
				expect(elements).toEqual<typeof elements>([
					{ id: "1", modifiedValue: "m-1" },
					{ id: "2", modifiedValue: "m-2" },
				]);
			});
		});
	});

	describe("errors", () => {
		test("single element", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: true,
			});
			await withServer(async () => {
				const elements = await Promise.all([
					client.batch.query({ id: "1" }).catch((e) => e),
					client.batch.query({ id: "fail-single" }).catch((e) => e),
				]);
				expect(elements[0]).toEqual<(typeof elements)[number]>({
					id: "1",
					modifiedValue: "m-1",
				});
				const error = elements[1];
				expect(error).toBeInstanceOf(TRPCClientError);
				const typedError = error as TRPCClientError<typeof router>;
				expect(typedError.shape?.message).toMatch("Failed mapElement call");
			});
		});

		test("common", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: true,
			});
			await withServer(async () => {
				const errors = await Promise.all([
					client.batch.query({ id: "1" }).catch((e) => e),
					client.batch.query({ id: "fail-all" }).catch((e) => e),
				]);
				expect(errors[0]).toBeInstanceOf(TRPCClientError);
				expect(errors[1]).toBeInstanceOf(TRPCClientError);
				const typedErrors = errors.map(
					(error) => error as TRPCClientError<typeof router>,
				);
				assert(typedErrors[0]);
				expect(typedErrors[0].shape?.message).toMatch(
					"Failed getElements call",
				);
				assert(typedErrors[1]);
				expect(typedErrors[1].shape?.message).toMatch(
					"Failed getElements call",
				);
			});
		});

		test("missing element", async ({ ctx }) => {
			const { withServer, client } = await getClientServer(ctx, router, {
				useBatch: true,
			});
			await withServer(async () => {
				const elements = await Promise.all([
					client.batch.query({ id: "1" }).catch((e) => e),
					client.batch.query({ id: "miss-element" }).catch((e) => e),
				]);
				expect(elements[0]).toEqual<(typeof elements)[number]>({
					id: "1",
					modifiedValue: "m-1",
				});
				const error = elements[1];
				expect(error).toBeInstanceOf(TRPCClientError);
				const typedError = error as TRPCClientError<typeof router>;
				expect(typedError.shape?.message).toMatch("Missing element error");
			});
		});
	});
});
