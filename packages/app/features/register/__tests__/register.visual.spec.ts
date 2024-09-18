import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test("Regular usage", async ({
	api,
	page,
	fields,
	fillValidFields,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAccount();

	await page.goto("/register");
	await expectScreenshotWithSchemes("empty.png");
	await fillValidFields();
	const { password, passwordRetype } = fields;
	await page
		.locator("div", { has: passwordRetype, hasNot: password })
		.locator("button")
		.click();

	await expectScreenshotWithSchemes("filled.png");
});

test("'auth.register' mutation", async ({
	page,
	api,
	fillValidFields,
	registerButton,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	clearToasts,
}) => {
	api.mockUtils.noAccount();
	api.mock("auth.register", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Email already exist",
		});
	});

	await page.goto("/register");
	await fillValidFields();
	await registerButton.click();
	await awaitCacheKey("auth.register", { errored: 1 });

	// TODO: Figure out what error should look like on register action
	// await expectScreenshotWithSchemes("error.png");

	const registerPause = api.createPause();
	api.mock("auth.register", async ({ next }) => {
		await registerPause.promise;
		return next();
	});
	await registerButton.click();

	await clearToasts();
	await expectScreenshotWithSchemes("loading.png");
});

test("Errors in fields", async ({
	api,
	page,
	fillInvalidFields,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAccount();

	await page.goto("/register");
	await fillInvalidFields();

	await expectScreenshotWithSchemes("fill-errors.png");
});
