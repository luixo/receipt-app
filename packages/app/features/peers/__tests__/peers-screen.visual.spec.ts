import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test } from "./peers-screen.utils";

test("Full screen with peers", async ({
	mockBase,
	page,
	peerRow,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	const { peers } = await mockBase();
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await awaitCacheKey("peers.get", { success: peers.length });
	await expectScreenshotWithSchemes("full-screen.png", {
		mask: [peerRow],
	});
});

test("Full screen with no peers", async ({
	page,
	mockBase,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockBase({
		generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await expectScreenshotWithSchemes("empty.png");
});

test("Connections badge", async ({
	page,
	api,
	faker,
	mockBase,
	headerAside,
	awaitCacheKey,
	expectScreenshotWithSchemes,
	connectionsBadge,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	api.mockFirst("userConnectionIntentions.getAll", {
		inbound: Array.from(
			{ length: faker.number.int({ min: 3, max: 6 }) },
			() => ({
				user: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			}),
		),
		outbound: [],
	});
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("userConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("connections-badge.png", {
		locator: [headerAside, connectionsBadge],
	});
});

test("Error state", async ({
	page,
	api,
	mockBase,
	expectScreenshotWithSchemes,
	errorMessage,
	awaitCacheKey,
	consoleManager,
}) => {
	await mockBase();
	const mockErrorMessage = `Mock "peers.getPaged" error`;
	consoleManager.ignore(mockErrorMessage);
	api.mockFirst("peers.getPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});

	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged", { error: 1 });

	await expect(errorMessage(mockErrorMessage)).toBeVisible();
	await expectScreenshotWithSchemes("error.png");
});
