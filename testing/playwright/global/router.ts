import { initTRPC } from "@trpc/server";
import { Queue } from "async-await-queue";
import { v4 } from "uuid";
import { z } from "zod";

import { getFreePort } from "~utils/port";
import { transformer } from "~utils/transformer";

const { router, procedure } = initTRPC.create({ transformer });

const queue = new Queue(1);

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
});

export type AppRouter = typeof appRouter;
