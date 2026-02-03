import { TRPCError } from "@trpc/server";
import { serialize } from "cookie";

import { AUTH_COOKIE } from "~app/utils/auth";
import { expect, test } from "~tests/frontend/fixtures";

test("On load without token", async ({ page, api, snapshotQueries }) => {
	api.mockUtils.noAuthPage();

	await snapshotQueries(() => page.goto("/confirm-email"));
	await expect(page).toHaveTitle("RA - Confirm email");
	// see https://github.com/TanStack/router/issues/5383
	await expect(async () => {
		const count = await page.locator("h2").count();
		if (count !== 1) {
			throw new Error("Expected to have single h2");
		}
	}).toPass();
	await expect(page.locator("h2")).toHaveText("Something went wrong");
	await expect(page.locator("h3")).toHaveText(
		"Please verify you got confirm link right",
	);
});

test.describe("'auth.confirmEmail' mutation", () => {
	test("loading", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		faker,
		loader,
	}) => {
		api.mockUtils.noAuthPage();
		const token = faker.string.uuid();
		const confirmPause = api.createPause();
		api.mockFirst("auth.confirmEmail", async ({ next }) => {
			await confirmPause.promise;
			return next();
		});
		await snapshotQueries(
			async () => {
				await page.goto(`/confirm-email?token=${token}`);
				await expect(loader).toBeVisible();
				await verifyToastTexts("Confirming email..");
			},
			{ name: "loading" },
		);
		await expect(page).toHaveURL(`/confirm-email?token=${token}`);
	});

	test("error", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		faker,
		errorMessage,
	}) => {
		api.mockUtils.noAuthPage();
		const token = faker.string.uuid();
		const rawErrorMessage = "Mock 'auth.confirmEmail' error";
		api.mockFirst("auth.confirmEmail", async () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: rawErrorMessage,
			});
		});
		await snapshotQueries(
			async () => {
				await page.goto(`/confirm-email?token=${token}`);
				await expect(errorMessage(rawErrorMessage)).toBeVisible();
				await verifyToastTexts(`Email confirmation failed: ${rawErrorMessage}`);
			},
			{ name: "error" },
		);
		await expect(page).toHaveURL(`/confirm-email?token=${token}`);
	});

	test("success", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		faker,
	}) => {
		api.mockUtils.noAuthPage();
		const token = faker.string.uuid();
		const confirmedEmail = faker.internet.email();
		api.mockFirst("auth.confirmEmail", { email: confirmedEmail });
		api.mockLast("receipts.getPaged", { count: 0, cursor: 0, items: [] });
		await snapshotQueries(
			async () => {
				await page.goto(`/confirm-email?token=${token}`);
				await api.mockUtils.authPage({ page });
				await verifyToastTexts(`Email "${confirmedEmail}" confirmed!`);
			},
			{ name: "success", blacklistKeys: ["receipts.getPaged"] },
		);
		await expect(page.locator("h3")).toHaveText(confirmedEmail);
		await expect(page.locator("h4")).toHaveText(
			"Email verification successful!",
		);
		await expect(page).toHaveURL(`/confirm-email?token=${token}`);
	});
});

test("Navigating back to the home page", async ({ page, api, faker }) => {
	const { unmockAccount } = api.mockUtils.noAuthPage();
	const confirmEmailPause = api.createPause();
	api.mockFirst("auth.confirmEmail", async ({ headers }) => {
		await confirmEmailPause.promise;
		headers.set(
			"set-cookie",
			serialize(AUTH_COOKIE, faker.string.uuid(), { path: "/" }),
		);
		return { email: faker.internet.email() };
	});
	await page.goto(`/confirm-email?token=${faker.string.uuid()}`);
	unmockAccount();
	await api.mockUtils.authPage({ page });
	api.mockFirst("receipts.getPaged", { items: [], count: 0, cursor: 0 });
	confirmEmailPause.resolve();
	await page.getByRole("button", { name: "To home page" }).click();
	await expect(page).toHaveURL("/receipts");
});
