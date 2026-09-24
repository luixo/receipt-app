import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Form", async ({
	page,
	api,
	addButton,
	fillValidForm,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await api.mockUtils.authPage();

	await page.navigate({ to: "/peers/add" });
	await awaitCacheKey("user.get");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add peer");
	await expectScreenshotWithSchemes("empty.png");

	await fillValidForm();
	await expect(addButton).toBeEnabled();
	await expectScreenshotWithSchemes("filled.png");
});

test.describe("Errors in form", () => {
	test("on field errors", async ({
		page,
		api,
		nameInput,
		emailInput,
		awaitCacheKey,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		await api.mockUtils.authPage();

		await page.navigate({ to: "/peers/add" });
		await awaitCacheKey("user.get");

		// fill then clear: isDirty stays true so the error renders
		await nameInput.fill("x");
		await nameInput.fill("");
		await nameInput.press("Tab");
		await expectScreenshotWithSchemes("name-error.png", {
			locator: page.locator('[data-slot="base"]', { has: nameInput }),
		});

		await emailInput.fill("not-an-email");
		await emailInput.press("Tab");
		await expectScreenshotWithSchemes("email-error.png", {
			locator: page.locator('[data-slot="base"]', { has: emailInput }),
		});
	});
});

test.describe("'peers.add' mutation", () => {
	test("loading", async ({
		page,
		api,
		addButton,
		fillValidForm,
		awaitCacheKey,
		clearToasts,
		faker,
		expectScreenshotWithSchemes,
	}) => {
		await api.mockUtils.authPage();

		const createPause = api.createPause();
		api.mockFirst("peers.add", async () => {
			await createPause.promise;
			return { id: faker.string.uuid(), connection: undefined };
		});

		await page.navigate({ to: "/peers/add" });
		await awaitCacheKey("user.get");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Add peer",
		);
		await fillValidForm();
		await expect(addButton).toBeEnabled();

		await addButton.click();
		await clearToasts();
		await expectScreenshotWithSchemes("loading.png");
	});
});
