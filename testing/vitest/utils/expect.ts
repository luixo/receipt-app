import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import snapshotDiff from "snapshot-diff";
import { expect } from "vitest";

import { createContext } from "@tests/backend/utils/context";
import type { TestContext } from "@tests/backend/utils/test";
import { test } from "@tests/backend/utils/test";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { formatErrorMessage } from "next-app/handlers/errors";

export const expectTRPCError = async (
	fn: () => Promise<unknown>,
	expectedCode: TRPC_ERROR_CODE_KEY,
	expectedMessage: string,
) => {
	let error;
	try {
		await fn();
	} catch (e) {
		error = e;
	}
	expect(error).toBeInstanceOf(TRPCError);
	const trpcError = error as TRPCError;
	expect({
		code: trpcError.code,
		message: formatErrorMessage(trpcError, trpcError.message),
	}).toEqual({
		code: expectedCode,
		message: expectedMessage,
	});
};

export const expectUnauthorizedError = (
	fn: (context: UnauthorizedContext) => Promise<unknown>,
) => {
	test("should be authenticated", async ({ ctx }) => {
		const context = createContext(ctx);
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
	const snapshotBefore = await ctx.dumpDatabase();
	const result = await fn();
	const snapshotAfter = await ctx.dumpDatabase();
	const diff = snapshotDiff(snapshotBefore, snapshotAfter, {
		contextLines: 0,
		stablePatchmarks: true,
		aAnnotation: "Before snapshot",
		bAnnotation: "After snapshot",
	});
	if (snapshotName) {
		expect(diff).toMatchSnapshot(snapshotName);
	} else {
		expect(diff).toMatchSnapshot();
	}
	return result;
};
