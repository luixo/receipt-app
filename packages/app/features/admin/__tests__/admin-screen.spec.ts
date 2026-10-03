import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("authenticated non-admin is redirected without seeing admin UI", async ({
	api,
	page,
}) => {
	await api.mockUtils.authPage();
	api.mockFirst("receipts.getPaged", { items: [], count: 0, cursor: 0 });
	await page.navigate({ to: "/admin" });
	await page.expectUrl({ to: "/receipts" });
	await expect(page.getByRole("heading", { name: "Admin panel" })).toHaveCount(
		0,
	);
	await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
});

test("admin sees peer names and unpaired users' emails with dimmed avatars", async ({
	page,
	mockAdmin,
	adminCards,
	awaitCacheKey,
}) => {
	const { peer, candidates } = await mockAdmin();
	const [connected, unpaired] = candidates;
	assert.ok(connected?.peer);
	assert.ok(unpaired);
	await page.navigate({ to: "/admin" });
	await awaitCacheKey("admin.users");
	await expect(page).toHaveTitle("RA - Admin panel");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Admin panel",
	);
	await expect(adminCards).toHaveCount(3);
	await expect(adminCards.filter({ hasText: peer.name })).toBeVisible();
	await expect(
		adminCards.filter({ hasText: connected.peer.name }),
	).toContainText(connected.user.email);
	const unpairedCard = adminCards.filter({ hasText: unpaired.user.email });
	await expect(unpairedCard.getByTestId("peer")).toContainText(
		unpaired.user.email,
	);
	await expect(unpairedCard.getByTestId("user-avatar")).toHaveClass(
		/grayscale/,
	);
	await expect(
		adminCards
			.filter({ hasText: connected.peer.name })
			.getByTestId("user-avatar"),
	).not.toHaveClass(/grayscale/);
	await expect(page.getByRole("button", { name: "Become" })).toHaveCount(2);
});

test("Become can be cancelled, confirmed, persists through navigation and reload, then reset", async ({
	page,
	mockAdmin,
	adminCards,
	cookieManager,
}) => {
	const { peer, candidates } = await mockAdmin();
	const [candidate] = candidates;
	assert.ok(candidate?.peer);
	await page.navigate({ to: "/admin" });
	const candidateCard = adminCards.filter({ hasText: candidate.user.email });
	await candidateCard.getByRole("button", { name: "Become" }).click();
	const confirmation = page.getByRole("dialog");
	await expect(confirmation).toContainText(candidate.user.email);
	await confirmation.getByRole("button", { name: "No" }).click();
	await expect(confirmation).toBeHidden();
	await expect(
		candidateCard.getByRole("button", { name: "Become" }),
	).toBeVisible();
	await expect(adminCards.first()).toContainText(peer.name);

	await candidateCard.getByRole("button", { name: "Become" }).click();
	await confirmation.getByRole("button", { name: "Yes" }).click();
	await expect(confirmation).toBeHidden();
	await expect(adminCards.first()).toContainText(candidate.peer.name);
	await expect(
		candidateCard.getByRole("button", { name: "Become" }),
	).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Become" })).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Reset to self" }),
	).toBeVisible();
	expect(await cookieManager.getCookie(PRETEND_USER_STORE_NAME)).toMatchObject({
		value: encodeURIComponent(JSON.stringify({ email: candidate.user.email })),
	});

	await page.getByRole("link", { name: "Settings" }).click();
	await page.expectUrl({ to: "/settings" });
	await page.getByRole("link", { name: "Admin" }).click();
	await page.expectUrl({ to: "/admin" });
	await expect(adminCards.first()).toContainText(candidate.peer.name);
	await page.reload();
	await expect(adminCards.first()).toContainText(candidate.peer.name);
	await expect(
		candidateCard.getByRole("button", { name: "Become" }),
	).toHaveCount(0);

	await page.getByRole("button", { name: "Reset to self" }).click();
	await expect(adminCards.first()).toContainText(peer.name);
	await expect(
		candidateCard.getByRole("button", { name: "Become" }),
	).toBeVisible();
	expect(
		await cookieManager.getCookie(PRETEND_USER_STORE_NAME),
	).toBeUndefined();
});

test("admin.users failure shows an error", async ({
	api,
	page,
	mockAdmin,
	consoleManager,
	awaitCacheKey,
	errorMessage,
}) => {
	await mockAdmin();
	const message = 'Mock "admin.users" error';
	consoleManager.ignore(message);
	api.mockFirst("admin.users", () => {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
	});
	await page.navigate({ to: "/admin" });
	await awaitCacheKey("admin.users", { error: 1 });
	await expect(errorMessage(message)).toBeVisible();
});

test("client navigation to admin shows loading skeleton while admin.users is pending", async ({
	api,
	page,
	mockAdmin,
	awaitCacheKey,
	adminCards,
}) => {
	await mockAdmin();
	await page.navigate({ to: "/settings" });
	const pause = api.createPause();
	api.mockFirst("admin.users", async ({ next }) => {
		await pause.promise;
		return next();
	});
	try {
		await page.getByRole("link", { name: "Admin" }).click();
		await page.expectUrl({ to: "/admin" });
		await awaitCacheKey("admin.users", { pending: 1 });
		await expect(page.getByTestId("peer-skeleton").first()).toBeVisible();
	} finally {
		pause.resolve();
	}
	await awaitCacheKey("admin.users", { success: 1 });
	await expect(adminCards).toHaveCount(3);
});
