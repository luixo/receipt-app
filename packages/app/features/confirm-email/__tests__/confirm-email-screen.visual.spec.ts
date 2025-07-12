import { TRPCError } from "@trpc/server";

import { test } from "~tests/frontend/fixtures";

test("Empty card on error", async ({
	page,
	api,
	expectScreenshotWithSchemes,
	clearToasts,
}) => {
	api.mockUtils.noAuthPage();
	await page.goto("/confirm-email");
	await clearToasts();
	await expectScreenshotWithSchemes("empty.png");
});

test.describe("States", () => {
	test("Error", async ({
		page,
		api,
		faker,
		expectScreenshotWithSchemes,
		clearToasts,
	}) => {
		api.mockUtils.noAuthPage();
		api.mockFirst("auth.confirmEmail", async () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Mock 'auth.confirmEmail' error",
			});
		});
		await page.goto(`/confirm-email?token=${faker.string.uuid()}`);
		await clearToasts();
		await expectScreenshotWithSchemes("error.png");
	});

	test("Loading", async ({
		page,
		api,
		faker,
		expectScreenshotWithSchemes,
		clearToasts,
	}) => {
		api.mockUtils.noAuthPage();
		const confirmPause = api.createPause();
		api.mockFirst("auth.confirmEmail", async ({ next }) => {
			await confirmPause.promise;
			return next();
		});
		await page.goto(`/confirm-email?token=${faker.string.uuid()}`);
		await clearToasts();
		await expectScreenshotWithSchemes("loading.png");
	});

	test("Success", async ({
		page,
		api,
		faker,
		expectScreenshotWithSchemes,
		clearToasts,
	}) => {
		api.mockUtils.noAuthPage();
		api.mockLast("receipts.getPaged", { count: 0, cursor: 0, items: [] });
		api.mockFirst("auth.confirmEmail", { email: faker.internet.email() });
		await page.goto(`/confirm-email?token=${faker.string.uuid()}`);
		await api.mockUtils.authPage({ page });
		await clearToasts();
		await expectScreenshotWithSchemes("success.png");
	});
});
