import { initTRPC } from "@trpc/server";
import type { Coverage } from "playwright/test";
import { z } from "zod";

import { transformer } from "~utils/transformer";

const { router, procedure } = initTRPC.create({ transformer });

type TestErrorEntry = { type: "info" | "error"; text: string };
export const testErrorEntries: Partial<Record<string, TestErrorEntry[]>> = {};

export const addTestServerError = ({
	testId,
	type,
	text,
}: { testId: string } & TestErrorEntry) => {
	testErrorEntries[testId] ??= [];
	testErrorEntries[testId].push({ type, text });
};

export const coverageData: Awaited<ReturnType<Coverage["stopJSCoverage"]>> = [];

export const appRouter = router({
	getTestErrors: procedure
		.input(z.strictObject({ testId: z.string() }))
		.query(({ input: { testId } }) => testErrorEntries[testId] ?? []),
	addCoverage: procedure.input(z.unknown().array()).mutation(({ input }) => {
		coverageData.push(
			...(input as Awaited<ReturnType<Coverage["stopJSCoverage"]>>),
		);
	}),
});

export type AppRouter = typeof appRouter;
