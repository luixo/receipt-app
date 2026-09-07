import { test } from "@playwright/test";
import type { TRPCClient } from "@trpc/client";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";

import { transformer } from "~utils/transformer";

import type { appRouter } from "../global/router";

type ServerWorkerFixture = {
	serverClient: TRPCClient<typeof appRouter>;
};

// oxlint-disable-next-line typescript/ban-types typescript/no-empty-object-type
export const serverFixtures = test.extend<{}, ServerWorkerFixture>({
	serverClient: [
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
			await use(client);
		},
		{ auto: true, scope: "worker" },
	],
});
