import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load", async ({
	page,
	addButton,
	snapshotQueries,
	awaitCacheKey,
	api,
}) => {
	await api.mockUtils.authPage();
	await snapshotQueries(async () => {
		await page.navigate({ to: "/peers/add" });
		await awaitCacheKey("account.get");
	});
	await expect(page).toHaveTitle("RA - Add peer");
	await expect(addButton).toBeDisabled();
});

test.describe("Invalid form disables submit button", () => {
	test.beforeEach(async ({ api, page, awaitCacheKey, fillValidForm }) => {
		await api.mockUtils.authPage();
		await page.navigate({ to: "/peers/add" });
		await awaitCacheKey("account.get");
		await fillValidForm();
	});

	test("on empty name", async ({ addButton, nameInput }) => {
		await nameInput.fill("");
		await expect(addButton).toBeDisabled();
	});

	test("on invalid email", async ({ addButton, emailInput }) => {
		await emailInput.fill("not-an-email");
		await emailInput.press("Tab");
		await expect(addButton).toBeDisabled();
	});
});

test("'peers.add' mutation", async ({
	page,
	api,
	addButton,
	nameInput,
	emailInput,
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	awaitCacheKey,
	fillValidForm,
	faker,
}) => {
	await api.mockUtils.authPage();
	const peerId = faker.string.uuid();
	const peerName = "Test peer";

	api.mockFirst("peers.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "peers.add" error`,
		});
	});

	await page.navigate({ to: "/peers/add" });
	await awaitCacheKey("account.get");
	await fillValidForm(peerName);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("peers.add", { error: 1 });
			await verifyToastTexts(`Mock "peers.add" error`);
		},
		{ name: "error" },
	);
	await page.expectUrl({ to: "/peers/add" });

	const createPause = api.createPause();
	api.mockFirst("peers.add", async () => {
		await createPause.promise;
		return { id: peerId, connection: undefined };
	});
	const buttonWithLoader = withLoader(addButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await addButton.click();
			await verifyToastTexts(`Adding peer "${peerName}"`);
		},
		{ name: "loading" },
	);
	await expect(addButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	for (const input of [nameInput, emailInput]) {
		await expect(input).toBeDisabled();
	}

	api.mockFirst("peers.get", ({ input: { id }, next }) => {
		if (id === peerId) {
			return {
				id: peerId,
				name: peerName,
				publicName: undefined,
				connectedAccount: undefined,
			};
		}
		return next();
	});

	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("peers.add");
			await verifyToastTexts(`Peer "${peerName}" added`);
		},
		{ name: "success", blacklistKeys: "peers.get", skipQueries: true },
	);
	await page.expectUrl({ to: "/peers/$id", params: { id: peerId } });
});
