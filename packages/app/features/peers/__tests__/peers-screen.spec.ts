import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test } from "./peers-screen.utils";

test.describe("On load", () => {
	test("with peers", async ({
		page,
		mockBase,
		peerRow,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { peers } = await mockBase();
		const [firstPeer] = peers;
		assert.ok(firstPeer);
		await snapshotQueries(async () => {
			await page.navigate({ to: "/peers" });

			await expect(page).toHaveTitle("RA - Peers");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText("Peers");
			await awaitCacheKey("peers.getPaged");
			await awaitCacheKey("peers.get", { success: peers.length });
			await expect(peerRow).toHaveCount(peers.length);
			await expect(peerRow.filter({ hasText: firstPeer.name })).toBeVisible();
		});
	});

	test("with no peers", async ({
		page,
		mockBase,
		emptyCard,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockBase({
			generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 0 }),
		});
		await snapshotQueries(async () => {
			await page.navigate({ to: "/peers" });
			await awaitCacheKey("peers.getPaged");
		});
		await expect(page.getByRole("heading", { level: 2 })).toHaveText(
			"You have no peers",
		);
		await expect(emptyCard("You have no peers")).toBeVisible();
	});
});

test("Empty state add button navigates to add peer screen", async ({
	page,
	mockBase,
	emptyCard,
}) => {
	await mockBase({
		generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/peers" });

	await emptyCard("You have no peers")
		.getByRole("button", { name: "Add peer" })
		.click();
	await page.expectUrl({ to: "/peers/add" });
});

test("Pagination", async ({
	page,
	api,
	mockPagedPeers,
	paginationBlock,
	loader,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockPagedPeers();
	const secondPageInput = { limit: 10, cursor: 10 };

	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.getPaged");
	await expect(paginationBlock).toBeVisible();

	const pause = api.createPause();
	api.mockFirst("peers.getPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});

	await snapshotQueries(
		async () => {
			await paginationBlock
				.getByRole("button", { name: "pagination item 2" })
				.click();
			await awaitCacheKey("peers.getPaged", {
				input: secondPageInput,
				pending: 1,
			});
			await expect(loader).toBeVisible();
			pause.resolve();
			await awaitCacheKey("peers.getPaged", {
				input: secondPageInput,
				success: 1,
			});
			await expect(loader).toBeHidden();
		},
		{ name: "page-2" },
	);
});

test("Peer row navigates to peer screen", async ({
	page,
	mockBase,
	peerRow,
	awaitCacheKey,
}) => {
	const { peers } = await mockBase();
	const [firstPeer] = peers;
	assert.ok(firstPeer);
	await page.navigate({ to: "/peers" });
	await awaitCacheKey("peers.get", { success: peers.length });

	await peerRow.filter({ hasText: firstPeer.name }).click();

	await page.expectUrl({ to: "/peers/$id", params: { id: firstPeer.id } });
});

test.describe("Header aside", () => {
	test("Add peer button", async ({ page, mockBase, addPeerButton }) => {
		await mockBase();
		await page.navigate({ to: "/peers" });

		await addPeerButton.click();
		await page.expectUrl({ to: "/peers/add" });
	});

	test("Connections button", async ({ page, mockBase, connectionsButton }) => {
		await mockBase();
		await page.navigate({ to: "/peers" });

		await connectionsButton.click();
		await page.expectUrl({ to: "/peers/connections" });
	});

	test.describe("Connections badge", () => {
		test("Shows inbound intentions amount", async ({
			page,
			api,
			faker,
			mockBase,
			connectionsBadge,
			awaitCacheKey,
		}) => {
			await mockBase();
			const inboundAmount = faker.number.int({ min: 3, max: 6 });
			api.mockFirst("userConnectionIntentions.getAll", {
				inbound: Array.from({ length: inboundAmount }, () => ({
					user: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				})),
				outbound: [],
			});
			await page.navigate({ to: "/peers" });

			await awaitCacheKey("userConnectionIntentions.getAll");
			await expect(connectionsBadge).toHaveText(String(inboundAmount));
		});

		test("Hidden when no intentions", async ({
			page,
			mockBase,
			connectionsBadge,
			awaitCacheKey,
		}) => {
			await mockBase();
			await page.navigate({ to: "/peers" });

			await awaitCacheKey("userConnectionIntentions.getAll");
			await expect(connectionsBadge).toHaveCount(0);
		});
	});
});

test("'peers.getPaged' error shows error message", async ({
	page,
	api,
	mockBase,
	errorMessage,
	awaitCacheKey,
	consoleManager,
	snapshotQueries,
}) => {
	await mockBase();
	const mockErrorMessage = `Mock "getPaged" error`;
	api.mockFirst("peers.getPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/peers" });
			await awaitCacheKey("peers.getPaged", { error: 1 });
			await expect(errorMessage(mockErrorMessage)).toBeVisible();
		},
		{ name: "error" },
	);
});
