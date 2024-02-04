import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test("Regular usage", async ({
	api,
	page,
	fields,
	fillValidFields,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuth();

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
	api.mockUtils.noAuth();
	api.mock("auth.register", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Email already exist",
		});
	});

	await page.goto("/register");
	await fillValidFields();
	await registerButton.click();
	await awaitCacheKey("auth.register");

	// TODO: Figure out what error should look like on register actino
	// await expectScreenshotWithSchemes("error.png");

	api.pause("auth.register");
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
	api.mockUtils.noAuth();

	await page.goto("/register");
	await fillInvalidFields();

	await expectScreenshotWithSchemes("fill-errors.png");
});
