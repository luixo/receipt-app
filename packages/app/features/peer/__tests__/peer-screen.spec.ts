import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load", async ({
	page,
	mockBase,
	openPeerScreen,
	peerPreview,
	nameInput,
	saveNameButton,
	addPublicNameButton,
	connectButton,
	removePeerButton,
}) => {
	const { targetPeer } = await mockBase();
	await openPeerScreen(targetPeer.id);

	await expect(page).toHaveTitle("RA - Peer");
	await expect(peerPreview.filter({ hasText: targetPeer.name })).toBeVisible();
	await expect(nameInput).toHaveValue(targetPeer.name);
	await expect(saveNameButton).not.toBeAttached();
	await expect(addPublicNameButton).toBeVisible();
	await expect(connectButton).toBeVisible();
	await expect(removePeerButton).toBeVisible();
});

test.describe("Name", () => {
	test("empty name disables the save button", async ({
		mockBase,
		openPeerScreen,
		nameInput,
		saveNameButton,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);

		await nameInput.fill("");
		await expect(saveNameButton).toBeVisible();
		await expect(saveNameButton).toBeDisabled();
	});

	test("'peers.update' mutation", async ({
		api,
		mockBase,
		openPeerScreen,
		nameInput,
		saveNameButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);
		await expect(saveNameButton).not.toBeAttached();

		await nameInput.fill("Updated name");
		await expect(saveNameButton).toBeEnabled();

		api.mockFirst("peers.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "peers.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await saveNameButton.click();
			await awaitCacheKey("peers.update", { error: 1 });
			await verifyToastTexts(`Error updating peer: Mock "peers.update" error`);
		});
		await expect(saveNameButton).toBeEnabled();

		api.mockFirst("peers.update", undefined);
		await snapshotQueries(
			async () => {
				await saveNameButton.click();
				await awaitCacheKey("peers.update");
			},
			{ name: "success" },
		);
		await expect(saveNameButton).not.toBeAttached();
		await expect(nameInput).toHaveValue("Updated name");
	});
});

test.describe("Public name", () => {
	test("empty public name disables the save button", async ({
		mockBase,
		openPeerScreen,
		addPublicNameButton,
		publicNameInput,
		savePublicNameButton,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);

		await addPublicNameButton.click();
		await publicNameInput.fill("a");
		await publicNameInput.fill("");
		await expect(savePublicNameButton).toBeVisible();
		await expect(savePublicNameButton).toBeDisabled();
	});

	test("adds a public name", async ({
		api,
		mockBase,
		openPeerScreen,
		addPublicNameButton,
		publicNameInput,
		savePublicNameButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);

		await addPublicNameButton.click();
		await publicNameInput.fill("Public nickname");
		await expect(savePublicNameButton).toBeEnabled();

		api.mockFirst("peers.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "peers.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await savePublicNameButton.click();
			await awaitCacheKey("peers.update", { error: 1 });
			await verifyToastTexts(`Error updating peer: Mock "peers.update" error`);
		});
		await expect(savePublicNameButton).toBeEnabled();

		api.mockFirst("peers.update", undefined);
		await snapshotQueries(
			async () => {
				await savePublicNameButton.click();
				await awaitCacheKey("peers.update");
			},
			{ name: "success" },
		);
		await expect(savePublicNameButton).not.toBeAttached();
	});

	test("edits and removes an existing public name", async ({
		api,
		mockBase,
		openPeerScreen,
		publicNameInput,
		savePublicNameButton,
		removePublicNameButton,
		snapshotQueries,
		awaitCacheKey,
	}) => {
		const { targetPeer } = await mockBase();
		api.mockFirst("peers.get", ({ input, next }) => {
			if (input.id !== targetPeer.id) {
				return next();
			}
			return { ...targetPeer, publicName: "Public nickname" };
		});
		await openPeerScreen(targetPeer.id);

		await expect(publicNameInput).toHaveValue("Public nickname");
		await expect(savePublicNameButton).not.toBeAttached();
		await expect(removePublicNameButton).toBeVisible();

		api.mockFirst("peers.update", undefined);
		await snapshotQueries(async () => {
			await removePublicNameButton.click();
			await awaitCacheKey("peers.update");
		});
		await expect(publicNameInput).toHaveValue("");
		await expect(removePublicNameButton).not.toBeAttached();
	});
});

test.describe("Connection", () => {
	test("connects to an  user, then cancels the outbound request", async ({
		api,
		faker,
		mockBase,
		openPeerScreen,
		connectButton,
		connectionEmailInput,
		linkButton,
		cancelRequestButton,
		outboundRequestInput,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);

		await connectButton.click();
		await connectionEmailInput.fill("not-an-email");
		await expect(linkButton).toBeDisabled();

		const email = faker.internet.email();
		await connectionEmailInput.fill(email);
		await expect(linkButton).toBeEnabled();

		api.mockFirst("userConnectionIntentions.add", () => {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Mock "userConnectionIntentions.add" error`,
			});
		});
		await snapshotQueries(async () => {
			await linkButton.click();
			await awaitCacheKey("userConnectionIntentions.add", { error: 1 });
			await verifyToastTexts(
				`Error sending connection intention: Mock "userConnectionIntentions.add" error`,
			);
		});

		api.mockFirst("userConnectionIntentions.add", ({ input }) => ({
			connected: false,
			user: {
				id: faker.string.uuid(),
				email: input.email,
				avatarUrl: undefined,
			},
			peer: { name: targetPeer.name },
		}));
		await snapshotQueries(
			async () => {
				await linkButton.click();
				await awaitCacheKey("userConnectionIntentions.add");
				await verifyToastTexts(`Connection intention to "${email}" sent`);
			},
			{ name: "success" },
		);
		await expect(outboundRequestInput).toHaveValue(email);

		api.mockFirst("userConnectionIntentions.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "userConnectionIntentions.remove" error`,
			});
		});
		await snapshotQueries(async () => {
			await cancelRequestButton.click();
			await awaitCacheKey("userConnectionIntentions.remove", {
				error: 1,
			});
			await verifyToastTexts(
				`Error removing invite: Mock "userConnectionIntentions.remove" error`,
			);
		});

		api.mockFirst("userConnectionIntentions.remove", undefined);
		await snapshotQueries(
			async () => {
				await cancelRequestButton.click();
				await awaitCacheKey("userConnectionIntentions.remove", {
					success: 1,
				});
			},
			{ name: "cancel" },
		);
		await expect(connectButton).toBeVisible();
	});

	test("unlinks a connected peer", async ({
		api,
		faker,
		mockBase,
		openPeerScreen,
		connectionEmailInput,
		unlinkButton,
		linkButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetPeer } = await mockBase();
		const connectedEmail = "connected@example.com";
		api.mockFirst("peers.get", ({ input, next }) => {
			if (input.id !== targetPeer.id) {
				return next();
			}
			return {
				...targetPeer,
				connectedUser: {
					id: faker.string.uuid(),
					email: connectedEmail,
					avatarUrl: undefined,
				},
			};
		});
		await openPeerScreen(targetPeer.id);

		await expect(connectionEmailInput).toHaveValue(connectedEmail);
		await expect(unlinkButton).toBeVisible();

		api.mockFirst("peers.unlink", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "peers.unlink" error`,
			});
		});
		await snapshotQueries(async () => {
			await unlinkButton.click();
			await awaitCacheKey("peers.unlink", { error: 1 });
			await verifyToastTexts(`Error unlinking peer: Mock "peers.unlink" error`);
		});

		api.mockFirst("peers.unlink", undefined);
		await snapshotQueries(
			async () => {
				await unlinkButton.click();
				await awaitCacheKey("peers.unlink");
			},
			{ name: "success" },
		);
		await expect(unlinkButton).not.toBeAttached();
		await expect(linkButton).toBeVisible();
	});
});

test.describe("Remove", () => {
	test("asks for confirmation, then handles error and success", async ({
		api,
		page,
		mockBase,
		openPeerScreen,
		removePeerButton,
		removePeerDialog,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
	}) => {
		const { targetPeer } = await mockBase();
		await openPeerScreen(targetPeer.id);

		await removePeerButton.click();
		await expect(removePeerDialog).toBeVisible();

		const yesButton = removePeerDialog.getByRole("button", { name: "Yes" });
		const noButton = removePeerDialog.getByRole("button", { name: "No" });

		await noButton.click();
		await expect(removePeerDialog).toBeHidden();

		await removePeerButton.click();
		api.mockFirst("peers.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "peers.remove" error`,
			});
		});
		await snapshotQueries(async () => {
			await yesButton.click();
			await awaitCacheKey("peers.remove", { error: 1 });
			await verifyToastTexts(`Error removing peer: Mock "peers.remove" error`);
		});
		await page.expectUrl({ to: "/peers/$id", params: { id: targetPeer.id } });

		const pause = api.createPause();
		api.mockFirst("peers.remove", async () => {
			await pause.promise;
		});
		// Removal navigates to the peers list, which fetches this
		api.mockFirst("peers.getPaged", { items: [], count: 0, cursor: 0 });
		await removePeerButton.click();
		await yesButton.click();
		await expect(removePeerButton).toBeDisabled();
		await expect(withLoader(removePeerButton)).toBeVisible();

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("peers.remove");
				await verifyToastTexts("Peer removed");
			},
			{ name: "success", skipQueries: true, blacklistKeys: "peers.getPaged" },
		);
		await page.expectUrl({ to: "/peers" });
	});
});
