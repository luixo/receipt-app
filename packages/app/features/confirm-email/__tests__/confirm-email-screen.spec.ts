import { TRPCError } from "@trpc/server";
import { serialize } from "cookie";

import { AUTH_COOKIE } from "~app/utils/auth";
import { expect, test } from "~tests/frontend/fixtures";

test("On load without token", async ({ page, api, snapshotQueries }) => {
	api.mockUtils.noAuthPage();

	await snapshotQueries(() => page.goto("/confirm-email"));
	await expect(page).toHaveTitle("RA - Confirm email");
	await expect(page.locator("h2")).toHaveText("Something went wrong");
	await expect(page.locator("h3")).toHaveText(
		"Please verify you got confirm link right",
	);
});

test("On load with token / 'auth.confirmEmail' mutation", async ({
	page,
	api,
	snapshotQueries,
	verifyToastTexts,
	faker,
	errorMessage,
	loader,
}) => {
	api.mockUtils.noAuthPage();
	const token = faker.string.uuid();
	const confirmPause = api.createPause();
	const rawErrorMessage = "Mock 'auth.confirmEmail' error";
	api.mockFirst("auth.confirmEmail", async () => {
		await confirmPause.promise;
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: rawErrorMessage,
		});
	});
	await snapshotQueries(
		async () => {
			await page.goto(`/confirm-email?token=${token}`);
			await expect(loader).toBeVisible();
			await verifyToastTexts("Confirming email..");
		},
		{ name: "loading" },
	);
	confirmPause.resolve();
	await snapshotQueries(
		async () => {
			await expect(errorMessage(rawErrorMessage)).toBeVisible();
			await verifyToastTexts(`Error confirming email: ${rawErrorMessage}`);
		},
		{ name: "error" },
	);
	const confirmedEmail = faker.internet.email();
	api.mockFirst("auth.confirmEmail", { email: confirmedEmail });
	await api.mockUtils.authPage({ page });
	api.mockLast("receipts.getPaged", { count: 0, cursor: 0, items: [] });
	await snapshotQueries(
		async () => {
			await page.locator("button", { hasText: "Retry" }).click();
			await verifyToastTexts(`Email "${confirmedEmail}" confirmed!`);
		},
		{ name: "success", blacklistKeys: ["receipts.getPaged"] },
	);
	await expect(page.locator("h3")).toHaveText(confirmedEmail);
	await expect(page.locator("h4")).toHaveText("Email verification successful!");
	await expect(page).toHaveURL(`/confirm-email?token=${token}`);
});

test("Nagivating back to the home page", async ({ page, api, faker }) => {
	api.mockUtils.noAuthPage();
	api.mockFirst("auth.confirmEmail", ({ headers }) => {
		headers.set(
			"set-cookie",
			serialize(AUTH_COOKIE, faker.string.uuid(), { path: "/" }),
		);
		return { email: faker.internet.email() };
	});
	await page.goto(`/confirm-email?token=${faker.string.uuid()}`);
	await page.locator("button", { hasText: "To home page" }).click();
	await expect(page).toHaveURL("/receipts");
});
