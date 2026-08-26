import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as userFixture } from "~app/components/app/__tests__/user.utils";
import { test as usersFixture } from "~app/features/users/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

const test = mergeTests(usersFixture, userFixture);

test("No connected account - no description", async ({
	faker,
	mockBase,
	openUsersScreen,
	user,
}) => {
	const {
		users: [firstUser],
	} = await mockBase({
		generateUsers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: undefined,
			},
		],
	});
	assert(firstUser);
	await openUsersScreen();
	const userLocator = user.filter({ hasText: firstUser.name });
	await expect(userLocator).toBeVisible();
	await expect(userLocator).not.toContainText("@");
});

test("Connected account - description", async ({
	faker,
	mockBase,
	openUsersScreen,
	user,
}) => {
	const {
		users: [firstUser],
	} = await mockBase({
		generateUsers: () => [
			{
				id: faker.string.uuid(),
				name: faker.person.fullName(),
				publicName: undefined,
				connectedAccount: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
					avatarUrl: undefined,
				},
			},
		],
	});
	assert(firstUser);
	assert(firstUser.connectedAccount);
	await openUsersScreen();
	const userLocator = user.filter({ hasText: firstUser.name });
	await expect(userLocator).toBeVisible();
	await expect(userLocator).toContainText(firstUser.connectedAccount.email);
});
