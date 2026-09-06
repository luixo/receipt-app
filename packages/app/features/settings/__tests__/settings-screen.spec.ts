import { TRPCError } from "@trpc/server";

import { SELECTED_COLOR_MODE_STORE_NAME } from "~app/utils/store/color-modes";
import { LANGUAGE_STORE_NAME } from "~app/utils/store/language";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { LOCALE_STORE_NAME } from "~app/utils/store/locale";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.describe("Language", () => {
	test("user can switch language", async ({
		page,
		openSettings,
		languageSelectButton,
		cookieManager,
	}) => {
		await openSettings();
		await expect(languageSelectButton).toHaveText("English");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Settings",
		);
		expect(await cookieManager.getCookie(LANGUAGE_STORE_NAME)).toBeUndefined();
		expect(await cookieManager.getCookie(LOCALE_STORE_NAME)).toMatchObject({
			value: "en-US",
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});

		await languageSelectButton.click();
		await page.getByRole("option", { name: "Русский", exact: true }).click();
		expect(await cookieManager.getCookie(LANGUAGE_STORE_NAME)).toMatchObject({
			value: "ru",
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});
		expect(await cookieManager.getCookie(LOCALE_STORE_NAME)).toMatchObject({
			value: "ru-RU",
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});

		await expect(languageSelectButton).toHaveText("Русский");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Настройки",
		);
	});
});

test.describe("Color mode", () => {
	test("auto checkbox toggles manual switch, switch toggles applied theme", async ({
		openSettings,
		colorModeAutoCheckbox,
		colorModeSwitch,
		html,
		page,
		cookieManager,
	}) => {
		await openSettings();
		await expect(colorModeAutoCheckbox).toBeChecked();
		await expect(colorModeSwitch).toBeDisabled();
		await expect(html).toHaveAttribute("data-theme", "light");
		expect(
			await cookieManager.getCookie(SELECTED_COLOR_MODE_STORE_NAME),
		).toBeUndefined();

		await colorModeAutoCheckbox.click();
		await expect(colorModeAutoCheckbox).not.toBeChecked();
		await expect(colorModeSwitch).toBeEnabled();
		await expect(colorModeSwitch).not.toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "light");

		await colorModeSwitch.click();
		await expect(colorModeSwitch).toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "dark");
		expect(
			await cookieManager.getCookie(SELECTED_COLOR_MODE_STORE_NAME),
		).toMatchObject({
			value: "dark",
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});

		await page.reload();
		await expect(colorModeAutoCheckbox).not.toBeChecked();
		await expect(colorModeSwitch).toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "dark");

		await colorModeSwitch.click();
		await expect(colorModeSwitch).not.toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "light");

		await colorModeAutoCheckbox.click();
		await expect(colorModeAutoCheckbox).toBeChecked();
		await expect(colorModeSwitch).toBeDisabled();
		await expect(html).toHaveAttribute("data-theme", "light");
	});
});

test.describe("Show resolved debts", () => {
	test("user can toggle show resolved debts, saved choice survives a reload", async ({
		openSettings,
		showResolvedDebtsSwitch,
		cookieManager,
		page,
	}) => {
		await openSettings();
		await expect(showResolvedDebtsSwitch).not.toBeChecked();
		expect(await cookieManager.getCookie(SETTINGS_STORE_NAME)).toBeUndefined();

		await showResolvedDebtsSwitch.click();
		await expect(showResolvedDebtsSwitch).toBeChecked();
		expect(await cookieManager.getCookie(SETTINGS_STORE_NAME)).toMatchObject({
			value: encodeURIComponent(JSON.stringify({ showResolvedDebts: true })),
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});

		await page.reload();
		await expect(showResolvedDebtsSwitch).toBeChecked();

		await showResolvedDebtsSwitch.click();
		await expect(showResolvedDebtsSwitch).not.toBeChecked();
	});
});

test.describe("Default limit", () => {
	test("user can change default limit, saved choice survives a reload", async ({
		page,
		openSettings,
		limitSelectButton,
		cookieManager,
	}) => {
		await openSettings();
		await expect(limitSelectButton).toHaveText("Items per page");
		expect(await cookieManager.getCookie(LIMIT_STORE_NAME)).toBeUndefined();

		await limitSelectButton.click();

		await page.getByRole("option", { name: "25", exact: true }).click();
		await expect(limitSelectButton).toHaveText("25");
		expect(await cookieManager.getCookie(LIMIT_STORE_NAME)).toMatchObject({
			value: "25",
			httpOnly: false,
			path: "/",
			sameSite: "Strict",
			secure: false,
		});

		await page.reload();
		await expect(limitSelectButton).toHaveText("25");

		await limitSelectButton.click();

		await page.getByRole("option", { name: "100", exact: true }).click();
		await expect(limitSelectButton).toHaveText("100");
	});
});

test.describe("Manually accept debts", () => {
	test("'accountSettings.update' mutation success", async ({
		api,
		openSettings,
		manualAcceptDebtsSwitch,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		await openSettings();
		await expect(manualAcceptDebtsSwitch).not.toBeChecked();
		api.mockFirst("accountSettings.update", undefined);

		await snapshotQueries(async () => {
			await manualAcceptDebtsSwitch.click();
			await awaitCacheKey("accountSettings.update");
			await verifyToastTexts();
		});

		await expect(manualAcceptDebtsSwitch).toBeChecked();
	});

	test("'accountSettings.update' mutation pending / error", async ({
		api,
		openSettings,
		manualAcceptDebtsSwitch,
		manualAcceptDebtsResetButton,
		errorMessage,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
	}) => {
		await openSettings();
		const pause = api.createPause();
		api.mockFirst("accountSettings.update", async () => {
			await pause.promise;
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Mock "accountSettings.update" error`,
			});
		});
		const switchWithLoader = withLoader(manualAcceptDebtsSwitch);
		await expect(switchWithLoader).toBeHidden();
		await awaitCacheKey("accountSettings.get");

		await snapshotQueries(
			async () => {
				await manualAcceptDebtsSwitch.click();
				await expect(manualAcceptDebtsSwitch).toBeDisabled();
				await expect(switchWithLoader).toBeVisible();
				await awaitCacheKey("accountSettings.get");
			},
			{ name: "loading" },
		);

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("accountSettings.update", { errored: 1 });
				await verifyToastTexts(
					`Account settings update failed: Mock "accountSettings.update" error`,
				);
			},
			{ name: "error" },
		);

		await expect(manualAcceptDebtsSwitch).not.toBeChecked();
		await expect(
			errorMessage(`Mock "accountSettings.update" error`),
		).toBeVisible();

		await manualAcceptDebtsResetButton.click();
		await expect(errorMessage()).toBeHidden();
	});
});

test.describe("Refresh", () => {
	test("user can refresh cached data", async ({
		openSettings,
		refreshButton,
		snapshotQueries,
	}) => {
		await openSettings();

		// Refetches everything currently mounted, e.g. `accountSettings.get`
		await snapshotQueries(async () => {
			await refreshButton.click();
		});
	});
});
