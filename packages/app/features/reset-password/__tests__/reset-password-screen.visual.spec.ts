import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test.beforeEach(({ api }) => {
	api.mockUtils.noAuthPage();
});

test("On load without token", async ({
	page,
	api,
	faker,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	api.mockFirst("resetPasswordIntentions.get", {
		email: faker.internet.email(),
	});
	await page.goto("/reset-password");
	await awaitCacheKey("resetPasswordIntentions.get");
	await expectScreenshotWithSchemes("empty.png");
});

test.describe("'resetPasswordIntentions.get' query", () => {
	test("loading", async ({
		page,
		api,
		faker,
		skeleton,
		expectScreenshotWithSchemes,
	}) => {
		// eslint-disable-next-line playwright/no-skipped-test
		test.skip(
			true,
			"We prefetch this query completely so loading state will hang it forever",
		);
		const getIntentionsPause = api.createPause();
		api.mockFirst("resetPasswordIntentions.get", async ({ next }) => {
			await getIntentionsPause.promise;
			return next();
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await expectScreenshotWithSchemes("query/loading.png", {
			locator: skeleton,
		});
	});

	test("success", async ({ page, api, expectScreenshotWithSchemes, faker }) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await expectScreenshotWithSchemes("query/success.png", {
			locator: page.locator("h3"),
		});
	});
});

test.describe("'auth.resetPassword' mutation", () => {
	test("loading", async ({
		page,
		api,
		expectScreenshotWithSchemes,
		faker,
		resetPasswordButton,
		fillValidFields,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		const resetPasswordPause = api.createPause();
		api.mockFirst("auth.resetPassword", async ({ next }) => {
			await resetPasswordPause.promise;
			return next();
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await fillValidFields();
		await resetPasswordButton.click();
		await expectScreenshotWithSchemes("mutation/loading.png", {
			mask: [page.locator("h3")],
		});
	});

	test("error", async ({
		page,
		api,
		faker,
		expectScreenshotWithSchemes,
		fillValidFields,
		resetPasswordButton,
		clearToasts,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		api.mockFirst("auth.resetPassword", async () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Mock 'auth.resetPassword' error",
			});
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await fillValidFields();
		await resetPasswordButton.click();
		await clearToasts();
		await expectScreenshotWithSchemes("mutation/error.png", {
			mask: [page.locator("h3")],
		});
	});
});

test.describe("form", () => {
	test("invalid fields", async ({
		page,
		api,
		faker,
		fillInvalidFields,
		expectScreenshotWithSchemes,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await fillInvalidFields();
		await expectScreenshotWithSchemes("invalid.png", {
			mask: [page.locator("h3")],
		});
	});
});
