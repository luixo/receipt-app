import { initTRPC } from "@trpc/server";
import { Queue } from "async-await-queue";
import type { Coverage } from "playwright/test";
import { v4 } from "uuid";
import { z } from "zod";

import { getFreePort } from "~utils/server/port";
import { transformer } from "~utils/transformer";

const { router, procedure } = initTRPC.create({ transformer });

const queue = new Queue(1);

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
	lockPort: procedure
		.output(z.strictObject({ port: z.number(), hash: z.string() }))
		.mutation(async () => {
			const hash = v4();
			await queue.wait(hash);
			const port = await getFreePort();
			return { port, hash };
		}),
	release: procedure
		.input(z.strictObject({ hash: z.string() }))
		.mutation(({ input: { hash } }) => queue.end(hash)),
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
