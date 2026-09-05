import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load", async ({
	page,
	mockBase,
	openUserScreen,
	userPreview,
	nameInput,
	saveNameButton,
	addPublicNameButton,
	connectButton,
	removeUserButton,
}) => {
	const { targetUser } = await mockBase();
	await openUserScreen(targetUser.id);

	await expect(page).toHaveTitle("RA - User");
	await expect(userPreview.filter({ hasText: targetUser.name })).toBeVisible();
	await expect(nameInput).toHaveValue(targetUser.name);
	await expect(saveNameButton).not.toBeAttached();
	await expect(addPublicNameButton).toBeVisible();
	await expect(connectButton).toBeVisible();
	await expect(removeUserButton).toBeVisible();
});

test.describe("Name", () => {
	test("empty name disables the save button", async ({
		mockBase,
		openUserScreen,
		nameInput,
		saveNameButton,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);

		await nameInput.fill("");
		await expect(saveNameButton).toBeVisible();
		await expect(saveNameButton).toBeDisabled();
	});

	test("'users.update' mutation", async ({
		api,
		mockBase,
		openUserScreen,
		nameInput,
		saveNameButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);
		await expect(saveNameButton).not.toBeAttached();

		await nameInput.fill("Updated name");
		await expect(saveNameButton).toBeEnabled();

		api.mockFirst("users.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "users.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await saveNameButton.click();
			await awaitCacheKey("users.update", { errored: 1 });
			await verifyToastTexts(`Error updating user: Mock "users.update" error`);
		});
		await expect(saveNameButton).toBeEnabled();

		api.mockFirst("users.update", undefined);
		await snapshotQueries(
			async () => {
				await saveNameButton.click();
				await awaitCacheKey("users.update");
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
		openUserScreen,
		addPublicNameButton,
		publicNameInput,
		savePublicNameButton,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);

		await addPublicNameButton.click();
		await publicNameInput.fill("a");
		await publicNameInput.fill("");
		await expect(savePublicNameButton).toBeVisible();
		await expect(savePublicNameButton).toBeDisabled();
	});

	test("adds a public name", async ({
		api,
		mockBase,
		openUserScreen,
		addPublicNameButton,
		publicNameInput,
		savePublicNameButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);

		await addPublicNameButton.click();
		await publicNameInput.fill("Public nickname");
		await expect(savePublicNameButton).toBeEnabled();

		api.mockFirst("users.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "users.update" error`,
			});
		});
		await snapshotQueries(async () => {
			await savePublicNameButton.click();
			await awaitCacheKey("users.update", { errored: 1 });
			await verifyToastTexts(`Error updating user: Mock "users.update" error`);
		});
		await expect(savePublicNameButton).toBeEnabled();

		api.mockFirst("users.update", undefined);
		await snapshotQueries(
			async () => {
				await savePublicNameButton.click();
				await awaitCacheKey("users.update");
			},
			{ name: "success" },
		);
		await expect(savePublicNameButton).not.toBeAttached();
	});

	test("edits and removes an existing public name", async ({
		api,
		mockBase,
		openUserScreen,
		publicNameInput,
		savePublicNameButton,
		removePublicNameButton,
		snapshotQueries,
		awaitCacheKey,
	}) => {
		const { targetUser } = await mockBase();
		api.mockFirst("users.get", ({ input, next }) => {
			if (input.id !== targetUser.id) {
				return next();
			}
			return { ...targetUser, publicName: "Public nickname" };
		});
		await openUserScreen(targetUser.id);

		await expect(publicNameInput).toHaveValue("Public nickname");
		await expect(savePublicNameButton).not.toBeAttached();
		await expect(removePublicNameButton).toBeVisible();

		api.mockFirst("users.update", undefined);
		await snapshotQueries(async () => {
			await removePublicNameButton.click();
			await awaitCacheKey("users.update");
		});
		await expect(publicNameInput).toHaveValue("");
		await expect(removePublicNameButton).not.toBeAttached();
	});
});

test.describe("Connection", () => {
	test("connects to an account, then cancels the outbound request", async ({
		api,
		faker,
		mockBase,
		openUserScreen,
		connectButton,
		connectionEmailInput,
		linkButton,
		cancelRequestButton,
		outboundRequestInput,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);

		await connectButton.click();
		await connectionEmailInput.fill("not-an-email");
		await expect(linkButton).toBeDisabled();

		const email = faker.internet.email();
		await connectionEmailInput.fill(email);
		await expect(linkButton).toBeEnabled();

		api.mockFirst("accountConnectionIntentions.add", () => {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Mock "accountConnectionIntentions.add" error`,
			});
		});
		await snapshotQueries(async () => {
			await linkButton.click();
			await awaitCacheKey("accountConnectionIntentions.add", { errored: 1 });
			await verifyToastTexts(
				`Error sending connection intention: Mock "accountConnectionIntentions.add" error`,
			);
		});

		api.mockFirst("accountConnectionIntentions.add", ({ input }) => ({
			connected: false,
			account: {
				id: faker.string.uuid(),
				email: input.email,
				avatarUrl: undefined,
			},
			user: { name: targetUser.name },
		}));
		await snapshotQueries(
			async () => {
				await linkButton.click();
				await awaitCacheKey("accountConnectionIntentions.add");
				await verifyToastTexts(`Connection intention to "${email}" sent`);
			},
			{ name: "success" },
		);
		await expect(outboundRequestInput).toHaveValue(email);

		api.mockFirst("accountConnectionIntentions.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "accountConnectionIntentions.remove" error`,
			});
		});
		await snapshotQueries(async () => {
			await cancelRequestButton.click();
			await awaitCacheKey("accountConnectionIntentions.remove", {
				errored: 1,
			});
			await verifyToastTexts(
				`Error removing invite: Mock "accountConnectionIntentions.remove" error`,
			);
		});

		api.mockFirst("accountConnectionIntentions.remove", undefined);
		await snapshotQueries(
			async () => {
				await cancelRequestButton.click();
				await awaitCacheKey("accountConnectionIntentions.remove", {
					succeed: 1,
				});
			},
			{ name: "cancel" },
		);
		await expect(connectButton).toBeVisible();
	});

	test("unlinks a connected user", async ({
		api,
		faker,
		mockBase,
		openUserScreen,
		connectionEmailInput,
		unlinkButton,
		linkButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		const { targetUser } = await mockBase();
		const connectedEmail = "connected@example.com";
		api.mockFirst("users.get", ({ input, next }) => {
			if (input.id !== targetUser.id) {
				return next();
			}
			return {
				...targetUser,
				connectedAccount: {
					id: faker.string.uuid(),
					email: connectedEmail,
					avatarUrl: undefined,
				},
			};
		});
		await openUserScreen(targetUser.id);

		await expect(connectionEmailInput).toHaveValue(connectedEmail);
		await expect(unlinkButton).toBeVisible();

		api.mockFirst("users.unlink", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "users.unlink" error`,
			});
		});
		await snapshotQueries(async () => {
			await unlinkButton.click();
			await awaitCacheKey("users.unlink", { errored: 1 });
			await verifyToastTexts(`Error unlinking user: Mock "users.unlink" error`);
		});

		api.mockFirst("users.unlink", undefined);
		await snapshotQueries(
			async () => {
				await unlinkButton.click();
				await awaitCacheKey("users.unlink");
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
		openUserScreen,
		removeUserButton,
		removeUserDialog,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
	}) => {
		const { targetUser } = await mockBase();
		await openUserScreen(targetUser.id);

		await removeUserButton.click();
		await expect(removeUserDialog).toBeVisible();

		const yesButton = removeUserDialog.getByRole("button", { name: "Yes" });
		const noButton = removeUserDialog.getByRole("button", { name: "No" });

		await noButton.click();
		await expect(removeUserDialog).toBeHidden();

		await removeUserButton.click();
		api.mockFirst("users.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "users.remove" error`,
			});
		});
		await snapshotQueries(async () => {
			await yesButton.click();
			await awaitCacheKey("users.remove", { errored: 1 });
			await verifyToastTexts(`Error removing user: Mock "users.remove" error`);
		});
		await expect(page).toHaveURL(`/users/${targetUser.id}`);

		const pause = api.createPause();
		api.mockFirst("users.remove", async () => {
			await pause.promise;
		});
		// Removal navigates to the users list, which fetches this
		api.mockFirst("users.getPaged", { items: [], count: 0, cursor: 0 });
		await removeUserButton.click();
		await yesButton.click();
		await expect(removeUserButton).toBeDisabled();
		await expect(withLoader(removeUserButton)).toBeVisible();

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("users.remove");
				await verifyToastTexts("User removed");
			},
			{ name: "success", skipQueries: true, blacklistKeys: "users.getPaged" },
		);
		await expect(page).toHaveURL("/users");
	});
});
