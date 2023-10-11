import { TRPCError } from "@trpc/server";

import { test } from "./register.utils.spec";

test.describe("Register page - visual", () => {
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
			.locator(".nextui-input-password-icon")
			.click();

		await expectScreenshotWithSchemes("filled.png");
	});

	test("Loading register mutation", async ({
		page,
		api,
		fillValidFields,
		registerButton,
		expectScreenshotWithSchemes,
	}) => {
		api.mockUtils.noAuth();
		api.pause("auth.register");

		await page.goto("/register");
		await fillValidFields();
		await registerButton.click();

		await expectScreenshotWithSchemes("loading.png");
	});

	// Figure out what error should look like on register actino
	test.fixme(
		"Error on register mutation",
		async ({
			page,
			api,
			fillValidFields,
			registerButton,
			expectScreenshotWithSchemes,
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

			await expectScreenshotWithSchemes("error.png");
		},
	);

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
});
