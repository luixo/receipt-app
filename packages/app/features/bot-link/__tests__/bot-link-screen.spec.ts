import { TRPCError } from "@trpc/server";

import { expect, test } from "~tests/frontend/fixtures";

test("Opened outside Telegram", async ({ page, api }) => {
	await api.mockUtils.authPage();
	await page.navigate({ to: "/bot-link" });
	await expect(page).toHaveTitle("RA - Link bot");
	await expect(page.getByRole("heading", { level: 2 })).toHaveText(
		"Can't link the bot",
	);
	await expect(page.getByRole("heading", { level: 3 })).toHaveText(
		`Open this page from the bot's "Authorize" button in Telegram.`,
	);
});

test.describe("'bot.link' mutation", () => {
	test("loading", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		loader,
		injectTelegramInitData,
	}) => {
		await api.mockUtils.authPage();
		await injectTelegramInitData();
		const linkBotPause = api.createPause();
		api.mockFirst("bot.link", async ({ next }) => {
			await linkBotPause.promise;
			return next();
		});
		await snapshotQueries(
			async () => {
				await page.navigate({ to: "/bot-link" });
				await expect(loader).toBeVisible();
				await verifyToastTexts("Linking bot..");
			},
			{ name: "loading" },
		);
	});

	test("error", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		errorMessage,
		injectTelegramInitData,
	}) => {
		await api.mockUtils.authPage();
		await injectTelegramInitData();
		const rawErrorMessage = "Mock 'bot.link' error";
		api.mockFirst("bot.link", () => {
			throw new TRPCError({ code: "UNAUTHORIZED", message: rawErrorMessage });
		});
		await snapshotQueries(
			async () => {
				await page.navigate({ to: "/bot-link" });
				await expect(errorMessage(rawErrorMessage)).toBeVisible();
				await verifyToastTexts(`Failed to link bot: ${rawErrorMessage}`);
			},
			{ name: "error" },
		);
	});

	test("success", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		injectTelegramInitData,
	}) => {
		await api.mockUtils.authPage();
		await injectTelegramInitData();
		api.mockFirst("bot.link", undefined);
		await snapshotQueries(
			async () => {
				await page.navigate({ to: "/bot-link" });
				await verifyToastTexts("Bot linked!");
			},
			{ name: "success" },
		);
		await expect(page.getByRole("heading", { level: 4 })).toHaveText(
			"Bot linked!",
		);
	});
});
