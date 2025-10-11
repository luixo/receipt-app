import { mergeTests } from "@playwright/test";

import type { Language } from "~app/utils/i18n-data";
import { expect, test as originalTest } from "~tests/frontend/fixtures";
import { i18nFixtures } from "~tests/frontend/fixtures/i18n";

type Fixtures = {
	openSettings: (options?: { awaitCache?: boolean }) => Promise<void>;
	openAccount: () => Promise<void>;
};

const test = mergeTests(originalTest, i18nFixtures).extend<Fixtures>({
	openSettings: ({ page, awaitCacheKey, api }, use) =>
		use(async ({ awaitCache = true } = {}) => {
			await api.mockUtils.authPage({ page });
			api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
			await page.goto("/settings");
			if (awaitCache) {
				await awaitCacheKey("accountSettings.get");
			}
		}),
	openAccount: ({ page, awaitCacheKey, api }, use) =>
		use(async () => {
			await api.mockUtils.authPage({ page });
			await page.goto("/account");
			await awaitCacheKey("account.get");
		}),
});

test.use({ locale: "en-GB" });
test.describe("Language strategies", () => {
	test("Cookie", async ({
		openSettings,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await openSettings();
		const ru = await getI18nResource("ru", "settings");
		await expect(page.locator("h1")).toHaveText(ru.header);
	});

	test.describe("Preferred language header", () => {
		test.use({ locale: "ru-RU" });
		test("Full tag", async ({ openSettings, page, getI18nResource }) => {
			await openSettings();
			const ru = await getI18nResource("ru", "settings");
			await expect(page.locator("h1")).toHaveText(ru.header);
		});

		test.use({ locale: "ru" });
		test("Short tag", async ({ openSettings, page, getI18nResource }) => {
			await openSettings();
			const ru = await getI18nResource("ru", "settings");
			await expect(page.locator("h1")).toHaveText(ru.header);
		});
	});

	test("Fallback", async ({ openSettings, page, getI18nResource }) => {
		await openSettings();
		const en = await getI18nResource("en", "settings");
		await expect(page.locator("h1")).toHaveText(en.header);
	});

	test("Invalid language", async ({
		openSettings,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("de" as Language);
		await openSettings();
		const en = await getI18nResource("en", "settings");
		await expect(page.locator("h1")).toHaveText(en.header);
	});
});

test.describe("Server-side translations", () => {
	test.use({ javaScriptEnabled: false });

	test("Static - head", async ({
		openSettings,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await openSettings({ awaitCache: false });
		const ru = await getI18nResource("ru", "default");
		expect(await page.title()).toEqual(
			ru.titles.template.replace("{{page}}", ru.titles.settings),
		);
	});

	test("React - on a page", async ({
		openSettings,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await openSettings({ awaitCache: false });
		const ru = await getI18nResource("ru", "settings");
		await expect(page.locator("h1")).toHaveText(ru.header);
	});
});

test.describe("Client-side translations", () => {
	test("Initial load does not fetch extra data", async ({
		openAccount,
		getNamespaces,
	}) => {
		await openAccount();
		expect(await getNamespaces()).toEqual(["default", "account"]);
	});

	test("Changing namespace loads data", async ({
		openAccount,
		page,
		api,
		getNamespaces,
	}) => {
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await openAccount();
		await page.locator("a[href='/settings']").click();
		await expect
			.poll(() => getNamespaces())
			.toEqual(["default", "account", "settings"]);
	});

	test("Changing language loads data", async ({
		openSettings,
		page,
		getI18nResource,
		getLanguages,
	}) => {
		await openSettings();
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
