import { mergeTests } from "@playwright/test";

import type { Language } from "~app/utils/i18n-data";
import { expect, test as originalTest } from "~tests/frontend/fixtures";
import { i18nFixtures } from "~tests/frontend/fixtures/i18n";

const test = mergeTests(originalTest, i18nFixtures);

test.use({ locale: "en-GB" });
test.describe("Language strategies", () => {
	test("Cookie", async ({ page, getI18nResource, setLanguageCookie }) => {
		await setLanguageCookie("ru");
		await page.goto("/settings");
		const ru = await getI18nResource("ru", "settings");
		await expect(page.locator("h1")).toHaveText(ru.header);
	});

	test.describe("Preferred language header", () => {
		test.use({ locale: "ru-RU" });
		test("Full tag", async ({ page, getI18nResource }) => {
			await page.goto("/settings");
			const ru = await getI18nResource("ru", "settings");
			await expect(page.locator("h1")).toHaveText(ru.header);
		});

		test.use({ locale: "ru" });
		test("Short tag", async ({ page, getI18nResource }) => {
			await page.goto("/settings");
			const ru = await getI18nResource("ru", "settings");
			await expect(page.locator("h1")).toHaveText(ru.header);
		});
	});

	test("Fallback", async ({ page, getI18nResource }) => {
		await page.goto("/settings");
		const en = await getI18nResource("en", "settings");
		await expect(page.locator("h1")).toHaveText(en.header);
	});

	test("Invalid language", async ({
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("de" as Language);
		await page.goto("/settings");
		const en = await getI18nResource("en", "settings");
		await expect(page.locator("h1")).toHaveText(en.header);
	});
});

test.describe("Server-side translations", () => {
	test.use({ javaScriptEnabled: false });

	test("Static - head", async ({
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await page.goto("/settings");
		const ru = await getI18nResource("ru", "default");
		expect(await page.title()).toEqual(
			ru.titles.template.replace("{{page}}", ru.titles.settings),
		);
	});

	test("React - on a page", async ({
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await page.goto("/settings");
		const ru = await getI18nResource("ru", "settings");
		await expect(page.locator("h1")).toHaveText(ru.header);
	});
});

test.describe("Client-side translations", () => {
	test("Initial load does not fetch extra data", async ({
		page,
		api,
		getNamespaces,
	}) => {
		const { user } = api.mockUtils.authPage();
		await page.goto("/account");
		await expect(page.locator("h1")).toHaveText(user.name);
		expect(await getNamespaces()).toEqual(["default"]);
	});

	test("Changing namespace loads data", async ({ page, getNamespaces }) => {
		await page.goto("/account");
		expect(await getNamespaces()).toEqual(["default"]);
		await page.locator("a[href='/settings']").click();
		await expect.poll(() => getNamespaces()).toEqual(["default", "settings"]);
	});

	test("Changing language loads data", async ({
		page,
		getI18nResource,
		getLanguages,
	}) => {
		await page.goto("/settings");
		expect(await getLanguages()).toEqual(["en"]);
		const en = await getI18nResource("en", "settings");
		await expect(page.locator("h1")).toHaveText(en.header);

		await page.locator("button", { hasText: "English" }).click();
		await page.getByRole("menuitem", { name: "Русский" }).click();

		const ru = await getI18nResource("ru", "settings");
		await expect(page.locator("h1")).toHaveText(ru.header);
		await expect.poll(() => getLanguages()).toEqual(["en", "ru"]);
	});
});
