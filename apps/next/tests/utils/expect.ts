import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import snapshotDiff from "snapshot-diff";
import { expect, test } from "vitest";

import { router } from "next-app/handlers";
import { formatErrorMessage } from "next-app/handlers/errors";
import { createContext } from "next-tests/utils/context";
import type { RouterCaller } from "next-tests/utils/types";

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
	fn: (caller: RouterCaller) => Promise<unknown>,
) => {
	test("should be authenticated", async () => {
		const caller = router.createCaller(createContext());
		await expectTRPCError(
			() => fn(caller),
			"UNAUTHORIZED",
			"No token provided",
		);
	});
};

export const expectDatabaseDiffSnapshot = async (
	fn: () => Promise<unknown>,
	snapshotName?: string,
) => {
	const { dumpDatabase } = global.testContext!;
	const snapshotBefore = await dumpDatabase();
	await fn();
	const snapshotAfter = await dumpDatabase();
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
};
