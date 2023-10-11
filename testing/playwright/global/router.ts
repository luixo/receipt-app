import { initTRPC } from "@trpc/server";
import { Queue } from "async-await-queue";
import findFreePorts from "find-free-ports";
import { v4 } from "uuid";
import { z } from "zod";

const { router, procedure } = initTRPC.create();

const queue = new Queue(1);

export const appRouter = router({
	lockPort: procedure
		.output(z.strictObject({ port: z.number(), hash: z.string() }))
		.mutation(async () => {
			const hash = v4();
			await queue.wait(hash);
			const port = (await findFreePorts())[0]!;
			return { port, hash };
		}),
	release: procedure
		.input(z.strictObject({ hash: z.string() }))
		.mutation(({ input: { hash } }) => queue.end(hash)),
});

export type AppRouter = typeof appRouter;
