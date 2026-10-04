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
	await expect(page.getByRole("heading", { name: "Admin panel" })).toBeHidden();
	await expect(page.getByRole("link", { name: "Admin" })).toBeHidden();
});

test("admin sees peer names and unpaired users' emails", async ({
	page,
	mockAdmin,
	adminCards,
	becomeButton,
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
	await expect(
		adminCards.filter({ hasText: unpaired.user.email }),
	).toContainText(unpaired.user.email);
	await expect(becomeButton).toHaveCount(2);
});

test("Become can be cancelled, confirmed, persists through navigation and reload, then reset", async ({
	page,
	mockAdmin,
	adminCards,
	becomeButton,
	becomeDialog,
	cookieManager,
	snapshotQueries,
}) => {
	const { peer, candidates } = await mockAdmin();
	const [candidate] = candidates;
	assert.ok(candidate?.peer);
	const candidatePeer = candidate.peer;
	await page.navigate({ to: "/admin" });
	const candidateCard = adminCards.filter({ hasText: candidate.user.email });
	const candidateBecomeButton = candidateCard.getByTestId("become-button");
	await snapshotQueries(
		async () => {
			await candidateBecomeButton.click();
			await expect(becomeDialog).toContainText(candidate.user.email);
		},
		{ name: "open" },
	);
	await snapshotQueries(
		async () => {
			await becomeDialog.getByRole("button", { name: "No" }).click();
			await expect(becomeDialog).toBeHidden();
			await expect(candidateBecomeButton).toBeVisible();
			await expect(adminCards.first()).toContainText(peer.name);
		},
		{ name: "cancel" },
	);

	await snapshotQueries(
		async () => {
			await candidateBecomeButton.click();
			await expect(becomeDialog).toBeVisible();
		},
		{ name: "reopen" },
	);
	await snapshotQueries(
		async () => {
			await becomeDialog.getByRole("button", { name: "Yes" }).click();
			await expect(becomeDialog).toBeHidden();
			await expect(adminCards.first()).toContainText(candidatePeer.name);
		},
		{ name: "become" },
	);
	await expect(candidateBecomeButton).toBeHidden();
	await expect(becomeButton).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Reset to self" }),
	).toBeVisible();
	expect(await cookieManager.getCookie(PRETEND_USER_STORE_NAME)).toMatchObject({
		value: encodeURIComponent(JSON.stringify({ email: candidate.user.email })),
	});

	await snapshotQueries(
		async () => {
			await page.getByRole("link", { name: "Settings" }).click();
			await page.expectUrl({ to: "/settings" });
		},
		{ name: "navigate-settings" },
	);
	await snapshotQueries(
		async () => {
			await page.getByRole("link", { name: "Admin" }).click();
			await page.expectUrl({ to: "/admin" });
			await expect(adminCards.first()).toContainText(candidatePeer.name);
		},
		{ name: "navigate-admin" },
	);

	await snapshotQueries(
		async () => {
			await page.reload();
			await expect(adminCards.first()).toContainText(candidatePeer.name);
			await expect(candidateBecomeButton).toBeHidden();
		},
		{ name: "reload" },
	);

	await snapshotQueries(
		async () => {
			await page.getByRole("button", { name: "Reset to self" }).click();
			await expect(adminCards.first()).toContainText(peer.name);
			await expect(candidateBecomeButton).toBeVisible();
		},
		{ name: "reset" },
	);
	expect(
		await cookieManager.getCookie(PRETEND_USER_STORE_NAME),
	).toBeUndefined();
});

test("admin.users failure shows an error", async ({
	api,
	page,
	mockAdmin,
	consoleManager,
	snapshotQueries,
	awaitCacheKey,
	errorMessage,
}) => {
	await mockAdmin();
	const message = 'Mock "admin.users" error';
	consoleManager.ignore(message);
	api.mockFirst("admin.users", () => {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
	});
	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/admin" });
			await awaitCacheKey("admin.users", { error: 1 });
			await expect(errorMessage(message)).toBeVisible();
		},
		{ name: "error" },
	);
});

test("client navigation to admin shows loading skeleton while admin.users is pending", async ({
	api,
	page,
	mockAdmin,
	snapshotQueries,
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
	await snapshotQueries(
		async () => {
			await page.getByRole("link", { name: "Admin" }).click();
			await page.expectUrl({ to: "/admin" });
			await awaitCacheKey("admin.users", { pending: 1 });
			await expect(page.getByTestId("peer-skeleton").first()).toBeVisible();
			pause.resolve();
			await awaitCacheKey("admin.users", { success: 1 });
			await expect(adminCards).toHaveCount(3);
		},
		{ name: "loading" },
	);
});
