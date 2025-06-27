import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { detailedDiff } from "deep-object-diff";
import { entries, fromEntries, keys, omitBy } from "remeda";
import { assert, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import type { UnauthorizedContext } from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";

export const expectLocalTRPCError = (
	error: Error,
	expectedCode: TRPC_ERROR_CODE_KEY,
	expectedMessage: string,
) => {
	expect(error).toBeInstanceOf(TRPCError);
	const trpcError = error as TRPCError;
	expect({
		code: trpcError.code,
		message: formatErrorMessage(trpcError, trpcError.message),
	}).toStrictEqual({
		code: expectedCode,
		message: expectedMessage,
	});
};

export const expectTRPCError = async (
	fn: () => Promise<unknown>,
	expectedCode: TRPC_ERROR_CODE_KEY,
	expectedMessage: string | RegExp,
) => {
	let error;
	try {
		await fn();
	} catch (e) {
		error = e;
	}
	expect(error).toBeInstanceOf(TRPCError);
	const trpcError = error as TRPCError;
	const formattedMessage = formatErrorMessage(trpcError, trpcError.message);
	expect
		.soft(trpcError.code)
		.toStrictEqual<typeof trpcError.code>(expectedCode);
	if (typeof expectedMessage === "string") {
		expect(formattedMessage).toStrictEqual<string>(expectedMessage);
	} else {
		expect(formattedMessage).toMatch(expectedMessage);
	}
};

export const expectUnauthorizedError = (
	fn: (context: UnauthorizedContext) => Promise<unknown>,
) => {
	test("should be authenticated", async ({ ctx }) => {
		const context = await createContext(ctx);
		await expectTRPCError(
			() => fn(context),
			"UNAUTHORIZED",
			"No token provided",
		);
	});
};

export const expectDatabaseDiffSnapshot = async <T>(
	ctx: TestContext,
	fn: () => Promise<T>,
	snapshotName?: string,
) => {
	assert(ctx.database, "DB diff snapshot requires DB to exist");
	const snapshotBefore = await ctx.database.dump();
	const result = await fn();
	const snapshotAfter = await ctx.database.dump();
	const diff = fromEntries(
		entries(detailedDiff(snapshotBefore, snapshotAfter))
			.filter(([, diffs]) => keys(diffs).length !== 0)
			.map(([detailedDiffKey, diffs]) => [
				detailedDiffKey,
				omitBy(
					diffs as Record<string, Record<string, unknown>>,
					(tableValues) => keys(tableValues).length === 0,
				),
			]),
	);
	if (snapshotName) {
		expect(diff).toMatchSnapshot(snapshotName);
	} else {
		expect(diff).toMatchSnapshot();
	}
	return result;
};
