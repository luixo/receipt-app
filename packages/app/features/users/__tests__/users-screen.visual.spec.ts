import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./users-screen.utils";

test("Full screen with users", async ({
	mockBase,
	page,
	userRow,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	const { users } = await mockBase();
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
	await awaitCacheKey("users.get", { success: users.length });
	await expectScreenshotWithSchemes("full-screen.png", {
		mask: [userRow],
	});
});

test("Full screen with no users", async ({
	page,
	mockBase,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockBase({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
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
	api.mockFirst("accountConnectionIntentions.getAll", {
		inbound: Array.from(
			{ length: faker.number.int({ min: 3, max: 6 }) },
			() => ({
				account: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			}),
		),
		outbound: [],
	});
	await page.navigate({ to: "/users" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
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
}) => {
	await mockBase();
	const mockErrorMessage = `Mock "getPaged" error`;
	api.mockFirst("users.getPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});

	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged", { error: 1 });

	await expect(errorMessage(mockErrorMessage)).toBeVisible();
	await expectScreenshotWithSchemes("error.png");
});
