import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as userAvatarFixture } from "~app/components/app/__tests__/user-avatar.utils";
import { test as userFixture } from "~app/components/app/__tests__/user.utils";
import { test as usersFixture } from "~app/features/users/__tests__/utils";

const test = mergeTests(usersFixture, userFixture, userAvatarFixture);

test("No connected account", async ({
	faker,
	mockBase,
	page,
	awaitCacheKey,
	user,
	expectScreenshotWithSchemes,
	userAvatar,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
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
	assert.ok(firstUser);
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
	await expectScreenshotWithSchemes("no-account.png", {
		locator: user.filter({ hasText: firstUser.name }),
		mask: [userAvatar],
		mapExpectedPixels: ({ expectedPixels }) => [
			{ ...expectedPixels[0], rgb: "#ff00ff" },
			...expectedPixels.slice(1),
		],
	});
});

test("Connected account", async ({
	page,
	awaitCacheKey,
	faker,
	mockBase,
	user,
	userAvatar,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
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
	assert.ok(firstUser);
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
	await expectScreenshotWithSchemes("connected-account.png", {
		locator: user.filter({ hasText: firstUser.name }),
		mask: [userAvatar],
		mapExpectedPixels: ({ expectedPixels }) => [
			{ ...expectedPixels[0], rgb: "#ff00ff" },
			...expectedPixels.slice(1),
		],
	});
});

test("Loading skeleton", async ({
	api,
	page,
	awaitCacheKey,
	mockBase,
	userSkeleton,
	expectScreenshotWithSchemes,
	skip,
	faker,
}, testInfo) => {
	skip(testInfo, "only-biggest");
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
	assert.ok(firstUser);
	const usersGetPause = api.createPause();
	api.mockFirst("users.get", async ({ next }) => {
		await usersGetPause.promise;
		return next();
	});
	await page.navigate({ to: "/users" });
	await awaitCacheKey("users.getPaged");
	await expectScreenshotWithSchemes("skeleton.png", { locator: userSkeleton });
	usersGetPause.resolve();
});
