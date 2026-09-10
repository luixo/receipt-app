import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./users-screen.utils";

test.describe("On load", () => {
	test("with users", async ({
		page,
		mockBase,
		userRow,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { users } = await mockBase();
		const [firstUser] = users;
		assert.ok(firstUser);
		await snapshotQueries(async () => {
			await page.navigate({ to: "/users" });

			await expect(page).toHaveTitle("RA - Users");
			await expect(page.getByRole("heading", { level: 1 })).toHaveText("Users");
			await awaitCacheKey("users.getPaged");
			await awaitCacheKey("users.get", { success: users.length });
			await expect(userRow).toHaveCount(users.length);
			await expect(userRow.filter({ hasText: firstUser.name })).toBeVisible();
		});
	});

	test("with no users", async ({
		page,
		mockBase,
		emptyCard,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockBase({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 0 }),
		});
		await snapshotQueries(async () => {
			await page.navigate({ to: "/users" });
			await awaitCacheKey("users.getPaged");
		});
		await expect(page.getByRole("heading", { level: 2 })).toHaveText(
			"You have no users",
		);
		await expect(emptyCard("You have no users")).toBeVisible();
	});
});

test("Empty state add button navigates to add user screen", async ({
	page,
	mockBase,
	emptyCard,
}) => {
	await mockBase({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/users" });

	await emptyCard("You have no users")
		.getByRole("button", { name: "Add user" })
		.click();
	await page.expectUrl({ to: "/users/add" });
});

test("Pagination", async ({
	page,
	api,
	mockPagedUsers,
	usersPagination,
	loader,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockPagedUsers();
	const secondPageInput = { limit: 10, cursor: 10 };

	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
	await expect(usersPagination).toBeVisible();

	const pause = api.createPause();
	api.mockFirst("users.getPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});

	await snapshotQueries(
		async () => {
			await usersPagination
				.getByRole("button", { name: "pagination item 2" })
				.click();
			await awaitCacheKey("users.getPaged", {
				input: secondPageInput,
				pending: 1,
			});
			await expect(loader).toBeVisible();
			pause.resolve();
			await awaitCacheKey("users.getPaged", {
				input: secondPageInput,
				success: 1,
			});
			await expect(loader).toBeHidden();
		},
		{ name: "page-2" },
	);
});

test("User row navigates to user screen", async ({
	page,
	mockBase,
	userRow,
	awaitCacheKey,
}) => {
	const { users } = await mockBase();
	const [firstUser] = users;
	assert.ok(firstUser);
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.get", { success: users.length });

	await userRow.filter({ hasText: firstUser.name }).click();

	await page.expectUrl({ to: "/users/$id", params: { id: firstUser.id } });
});

test.describe("Header aside", () => {
	test("Add user button", async ({ page, mockBase, addUserButton }) => {
		await mockBase();
		await page.navigate({ to: "/users" });

		await addUserButton.click();
		await page.expectUrl({ to: "/users/add" });
	});

	test("Connections button", async ({ page, mockBase, connectionsButton }) => {
		await mockBase();
		await page.navigate({ to: "/users" });

		await connectionsButton.click();
		await page.expectUrl({ to: "/users/connections" });
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
			api.mockFirst("accountConnectionIntentions.getAll", {
				inbound: Array.from({ length: inboundAmount }, () => ({
					account: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				})),
				outbound: [],
			});
			await page.navigate({ to: "/users" });

			await awaitCacheKey("accountConnectionIntentions.getAll");
			await expect(connectionsBadge).toHaveText(String(inboundAmount));
		});

		test("Hidden when no intentions", async ({
			page,
			mockBase,
			connectionsBadge,
			awaitCacheKey,
		}) => {
			await mockBase();
			await page.navigate({ to: "/users" });

			await awaitCacheKey("accountConnectionIntentions.getAll");
			await expect(connectionsBadge).toHaveCount(0);
		});
	});
});

test("'users.getPaged' error shows error message", async ({
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
	api.mockFirst("users.getPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/users" });
			await awaitCacheKey("users.getPaged", { error: 1 });
			await expect(errorMessage(mockErrorMessage)).toBeVisible();
		},
		{ name: "error" },
	);
});
