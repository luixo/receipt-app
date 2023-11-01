import { faker } from "@faker-js/faker";
import type { Expect, Locator, PageScreenshotOptions } from "@playwright/test";
import { test as base, expect } from "@playwright/test";
import type {
	DehydratedState,
	QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import joinImages from "join-images";
import * as timekeeper from "timekeeper";

import { setSeed } from "@tests/backend/utils/faker";
import type { TRPCQueryKey } from "app/trpc";

import type { ApiManager, WorkerManager } from "./fixtures/api";
import { createApiManager, createWorkerManager } from "./fixtures/api";
import type { ConsoleManager } from "./fixtures/console";
import { createConsoleManager } from "./fixtures/console";
import type { MockUtils } from "./fixtures/mock-utils";
import { getMockUtils } from "./fixtures/mock-utils";
import { gotoWithMocks, stableScreenshot } from "./fixtures/page";
import type { SnapshotQueryCacheOptions } from "./fixtures/queries";
import { awaitQuery, expectQueriesSnapshot } from "./fixtures/queries";
import type { appRouter } from "./global/router";

declare global {
	interface Window {
		getDehydratedCache: () => DehydratedState;
		subscribeToQuery: (
			queryKey: TRPCQueryKey,
			subscriber: (event: QueryCacheNotifyEvent) => void,
		) => void;
		dismissToasts: () => void;
	}
}

declare module "@playwright/test" {
	interface Page {
		stableScreenshot: (
			options?: PageScreenshotOptions & { stableDelay?: number },
		) => Promise<Buffer>;
	}
}

type Fixture = {
	api: ApiManager & {
		mockUtils: MockUtils;
	};
	snapshotQueries: <T>(
		fn: () => Promise<T>,
		options?: Partial<SnapshotQueryCacheOptions>,
	) => Promise<T>;
	awaitQuery: <T extends TRPCQueryKey>(path: T) => Promise<void>;
	expectScreenshotWithSchemes: (
		name: string,
		options?: PageScreenshotOptions &
			Parameters<ReturnType<Expect>["toMatchSnapshot"]>[0],
	) => Promise<void>;
	consoleManager: ConsoleManager;
	consoleMessages: void;
	verifyToastTexts: (textOrTexts: string | string[]) => Promise<void>;
	clearToasts: () => Promise<void>;
	withLoader: (locator: Locator) => Locator;
	faker: void;
};
type WorkerFixture = {
	globalApiManager: WorkerManager;
	timekeeper: void;
};

export const test = base.extend<Fixture, WorkerFixture>({
	globalApiManager: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const managerPort = process.env.MANAGER_PORT;
			const client = createTRPCProxyClient<typeof appRouter>({
				links: [httpBatchLink({ url: `http://localhost:${managerPort}` })],
			});
			const { port, hash } = await client.lockPort.mutate();
			const workerManager = await createWorkerManager(port);
			const cleanup = await workerManager.start();
			await client.release.mutate({ hash });
			await use(workerManager);
			await cleanup();
		},
		{ auto: true, scope: "worker" },
	],
	timekeeper: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			timekeeper.freeze(new Date("2020-01-01"));
			await use();
			timekeeper.reset();
		},
		{ auto: true, scope: "worker" },
	],
	faker: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use, testInfo) => {
			// Remove first element as it is a file name
			setSeed(faker, testInfo.titlePath.slice(0, 1).join(" / "));
			await use();
		},
		{ auto: true },
	],
	api: [
		async ({ globalApiManager, context }, use) => {
			const { cleanup, ...api } = await createApiManager(
				globalApiManager,
				context,
			);
			await use({ ...api, mockUtils: getMockUtils(api) });
			await cleanup();
		},
		{ auto: true },
	],
	snapshotQueries: async ({ page, api }, use, testInfo) => {
		await use((fn, options) =>
			expectQueriesSnapshot(page, api, testInfo, fn, options),
		);
	},
	awaitQuery: async ({ page }, use) => {
		await use((queryKey) => awaitQuery(page, queryKey));
	},
	expectScreenshotWithSchemes: async ({ page }, use) => {
		await use(
			async (
				name,
				{
					maxDiffPixelRatio,
					maxDiffPixels,
					threshold,
					fullPage = true,
					mask = [page.getByTestId("sticky-menu")],
					animations = "disabled",
					...restScreenshotOptions
				} = {},
			) => {
				const screenshotOptions = {
					fullPage,
					mask,
					animations,
					...restScreenshotOptions,
				};
				await page.emulateMedia({ colorScheme: "light" });
				const lightImage = await page.stableScreenshot(screenshotOptions);
				await page.emulateMedia({ colorScheme: "dark" });
				const darkImage = await page.stableScreenshot(screenshotOptions);

				const mergedImage = await joinImages([lightImage, darkImage], {
					direction: "horizontal",
					color: "#00ff00",
				});
				await expect
					.soft(await mergedImage.toFormat("png").toBuffer())
					.toMatchSnapshot(name, {
						maxDiffPixelRatio,
						maxDiffPixels,
						threshold,
					});
			},
		);
	},
	verifyToastTexts: async ({ page }, use) => {
		await use((textOrTexts) =>
			expect
				.poll(
					() =>
						page.evaluate(() =>
							Array.from(document.querySelectorAll(".toaster > div")).map(
								(toast) =>
									toast instanceof HTMLDivElement ? toast.innerText : "unknown",
							),
						),
					// Every toast is shown for at least 1 second
					{ message: "Toast messages differ", timeout: 1000 },
				)
				.toEqual(Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts]),
		);
	},
	clearToasts: async ({ page }, use) => {
		await use(async () => {
			await page.evaluate(() => {
				if (!window.dismissToasts) {
					return;
				}
				window.dismissToasts();
			});
			await page.locator(".toaster > div").waitFor({ state: "detached" });
		});
	},
	// eslint-disable-next-line no-empty-pattern
	consoleManager: async ({}, use) => use(createConsoleManager()),
	consoleMessages: [
		async ({ page, consoleManager }, use) => {
			page.on("console", consoleManager.onMessage);
			await use();
			if (process.env.CI) {
				expect.soft(consoleManager.getMessages()).toStrictEqual([]);
			}
		},
		{ auto: true },
	],
	page: async ({ page, api }, use) => {
		await page.emulateMedia({ colorScheme: "light" });
		page.goto = gotoWithMocks(page, api);
		page.stableScreenshot = stableScreenshot(page);
		await use(page);
	},
	withLoader: async ({ page }, use) => {
		await use((locator) =>
			locator.filter({
				has: page.locator('[aria-label="Loading"]'),
			}),
		);
	},
});

export { expect };
