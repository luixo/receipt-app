import { TRPCError } from "@trpc/server";

import { SELECTED_COLOR_MODE_STORE_NAME } from "~app/utils/store/color-modes";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { expect } from "~tests/frontend/fixtures";

import { getSelectOption, test } from "./utils";

test.describe("Language", () => {
	// No reload-persistence check here: switching language calls `i18n.changeLanguage`
	// (in-memory only) and `setLocale` (writes the `ssrContext:locale` cookie used for
	// Intl formatting) — neither persists the UI language for the next visit. SSR
	// language selection reads a separate `receipt_language` cookie
	// (`COOKIE_LANGUAGE_NAME`, apps/web/src/utils/i18n.ts) that nothing ever writes, so
	// a chosen language does not currently survive a reload.
	test("user can switch language", async ({
		page,
		openSettings,
		languageSelectButton,
	}) => {
		await openSettings();
		await expect(languageSelectButton).toHaveText("English");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Settings",
		);

		await languageSelectButton.click();
		await getSelectOption(page, "Русский").click();

		await expect(languageSelectButton).toHaveText("Русский");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Настройки",
		);
	});
});

test.describe("Color mode", () => {
	test("auto checkbox toggles manual switch, switch toggles applied theme, saved choice survives a reload", async ({
		openSettings,
		colorModeAutoCheckbox,
		colorModeAutoLabel,
		colorModeSwitch,
		html,
		getCookie,
		reload,
	}) => {
		await openSettings();
		await expect(colorModeAutoCheckbox).toBeChecked();
		await expect(colorModeSwitch).toBeDisabled();
		await expect(html).toHaveAttribute("data-theme", "light");
		expect(await getCookie(SELECTED_COLOR_MODE_STORE_NAME)).toBeUndefined();

		await colorModeAutoLabel.click();
		await expect(colorModeAutoCheckbox).not.toBeChecked();
		await expect(colorModeSwitch).toBeEnabled();
		await expect(colorModeSwitch).not.toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "light");

		await colorModeSwitch.click();
		await expect(colorModeSwitch).toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "dark");
		expect(await getCookie(SELECTED_COLOR_MODE_STORE_NAME)).toBe("dark");

		await reload();
		await expect(colorModeAutoCheckbox).not.toBeChecked();
		await expect(colorModeSwitch).toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "dark");

		await colorModeSwitch.click();
		await expect(colorModeSwitch).not.toBeChecked();
		await expect(html).toHaveAttribute("data-theme", "light");

		await colorModeAutoLabel.click();
		await expect(colorModeAutoCheckbox).toBeChecked();
		await expect(colorModeSwitch).toBeDisabled();
		await expect(html).toHaveAttribute("data-theme", "light");
	});
});

test.describe("Show resolved debts", () => {
	test("user can toggle show resolved debts, saved choice survives a reload", async ({
		openSettings,
		showResolvedDebtsSwitch,
		getCookie,
		reload,
	}) => {
		await openSettings();
		await expect(showResolvedDebtsSwitch).not.toBeChecked();
		expect(await getCookie(SETTINGS_STORE_NAME)).toBeUndefined();

		await showResolvedDebtsSwitch.click();
		await expect(showResolvedDebtsSwitch).toBeChecked();
		expect(await getCookie(SETTINGS_STORE_NAME)).toBe(
			JSON.stringify({ showResolvedDebts: true }),
		);

		await reload();
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
		getCookie,
		reload,
	}) => {
		await openSettings();
		await expect(limitSelectButton).toHaveText("Items per page");
		expect(await getCookie(LIMIT_STORE_NAME)).toBeUndefined();

		await limitSelectButton.click();
		await getSelectOption(page, "25").click();
		await expect(limitSelectButton).toHaveText("25");
		expect(await getCookie(LIMIT_STORE_NAME)).toBe("25");

		await reload();
		await expect(limitSelectButton).toHaveText("25");

		await limitSelectButton.click();
		await getSelectOption(page, "100").click();
		await expect(limitSelectButton).toHaveText("100");
	});
});

// Unlike the other options on this screen, this one is persisted server-side
// via `accountSettings.update`, not as a client-side cookie, so there's no
// cookie/reload check here.
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

		await snapshotQueries(
			async () => {
				await manualAcceptDebtsSwitch.click();
				await expect(manualAcceptDebtsSwitch).toBeDisabled();
				await expect(switchWithLoader).toBeVisible();
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
