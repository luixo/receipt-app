import { mergeTests } from "@playwright/test";

import type { Language } from "~app/utils/i18n-data";
import { expect, test as originalTest } from "~tests/frontend/fixtures";
import { i18nFixtures } from "~tests/frontend/fixtures/i18n";

const test = mergeTests(originalTest, i18nFixtures);

test.use({ locale: "en-GB" });

test.describe("Language strategies", () => {
	test("Cookie", async ({ api, page, getI18nResource, setLanguageCookie }) => {
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await setLanguageCookie("ru");
		await page.navigate({ to: "/settings" });
		const ru = await getI18nResource("ru", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.header);
	});

	test.describe("Preferred language header", () => {
		test.use({ locale: "ru-RU" });

		test("Full tag", async ({ api, page, getI18nResource }) => {
			await api.mockUtils.authPage();
			api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
			await page.navigate({ to: "/settings" });
			const ru = await getI18nResource("ru", "settings");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				ru.header,
			);
		});

		test.use({ locale: "ru" });

		test("Short tag", async ({ api, page, getI18nResource }) => {
			await api.mockUtils.authPage();
			api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
			await page.navigate({ to: "/settings" });
			const ru = await getI18nResource("ru", "settings");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				ru.header,
			);
		});
	});

	test("Fallback", async ({ api, page, getI18nResource }) => {
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/settings" });
		const en = await getI18nResource("en", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.header);
	});

	test("Invalid language", async ({
		api,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("de" as Language);
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/settings" });
		const en = await getI18nResource("en", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.header);
	});
});

test.describe("Server-side translations", () => {
	test.use({ javaScriptEnabled: false });

	test("Static - head", async ({
		api,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/settings" });
		const ru = await getI18nResource("ru", "default");
		expect(await page.title()).toEqual(
			ru.titles.template.replace("{{page}}", ru.titles.settings),
		);
	});

	test("React - on a page", async ({
		api,
		page,
		getI18nResource,
		setLanguageCookie,
	}) => {
		await setLanguageCookie("ru");
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/settings" });
		const ru = await getI18nResource("ru", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.header);
	});
});

test.describe("Client-side translations", () => {
	test("Initial load does not fetch extra data", async ({
		getNamespaces,
		awaitCacheKey,
		page,
		api,
	}) => {
		await api.mockUtils.authPage();
		await page.navigate({ to: "/account" });
		await awaitCacheKey("account.get");
		expect(await getNamespaces()).toEqual(["default", "account"]);
	});

	test("Changing namespace loads data", async ({
		page,
		api,
		getNamespaces,
	}) => {
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/account" });
		await page.getByRole("link", { name: "Settings" }).click();
		await expect
			.poll(() => getNamespaces())
			.toEqual(["default", "account", "settings"]);
	});

	test("Changing language loads data", async ({
		api,
		page,
		getI18nResource,
		getLanguages,
		awaitCacheKey,
	}) => {
		await api.mockUtils.authPage();
		api.mockFirst("accountSettings.get", { manualAcceptDebts: true });
		await page.navigate({ to: "/settings" });
		await awaitCacheKey("accountSettings.get");
		expect(await getLanguages()).toEqual(["en"]);
		const en = await getI18nResource("en", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.header);

		await page.locator("button", { hasText: "English" }).click();
		await page.getByRole("option", { name: "Русский" }).click();

		const ru = await getI18nResource("ru", "settings");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.header);
		await expect.poll(() => getLanguages()).toEqual(["en", "ru"]);
	});
});
