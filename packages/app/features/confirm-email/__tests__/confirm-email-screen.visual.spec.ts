import { TRPCError } from "@trpc/server";

import { test } from "~tests/frontend/fixtures";

test("Empty card on error", async ({
	page,
	api,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuthPage();
	await page.navigate({ to: "/confirm-email" });
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
		api.mockFirst("auth.confirmEmail", () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Mock 'auth.confirmEmail' error",
			});
		});
		const token = faker.string.uuid();
		await page.navigate({ to: "/confirm-email", search: { token } });
		await clearToasts(1);
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
		const token = faker.string.uuid();
		await page.navigate({ to: "/confirm-email", search: { token } });
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
		const confirmPause = api.createPause();
		api.mockFirst("auth.confirmEmail", async () => {
			await confirmPause.promise;
			return { email: faker.internet.email() };
		});
		const token = faker.string.uuid();
		await page.navigate({ to: "/confirm-email", search: { token } });
		await api.mockUtils.authPage();
		await clearToasts(1);
		confirmPause.resolve();
		await clearToasts(1);
		await expectScreenshotWithSchemes("success.png");
	});
});
