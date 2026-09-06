import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Default state", async ({
	mockBase,
	openUserScreen,
	expectScreenshotWithSchemes,
}) => {
	const { targetUser } = await mockBase();
	await openUserScreen(targetUser.id);
	await expectScreenshotWithSchemes("default-state.png");
});

test("Filled state", async ({
	api,
	faker,
	mockBase,
	openUserScreen,
	connectionEmailInput,
	expectScreenshotWithSchemes,
}) => {
	const { targetUser } = await mockBase();
	api.mockFirst("users.get", ({ input, next }) => {
		if (input.id !== targetUser.id) {
			return next();
		}
		return {
			...targetUser,
			publicName: "Public nickname",
			connectedAccount: {
				id: faker.string.uuid(),
				email: "connected@example.com",
				avatarUrl: undefined,
			},
		};
	});
	await openUserScreen(targetUser.id);
	await expect(connectionEmailInput).toHaveValue("connected@example.com");
	await expectScreenshotWithSchemes("filled-state.png");
});

test("Connection form open", async ({
	mockBase,
	openUserScreen,
	connectButton,
	connectionEmailInput,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { targetUser } = await mockBase();
	await openUserScreen(targetUser.id);
	await connectButton.click();
	await expect(connectionEmailInput).toBeVisible();
	await expectScreenshotWithSchemes("connection-form-open.png");
});

test("Remove confirmation dialog", async ({
	mockBase,
	openUserScreen,
	removeUserButton,
	removeUserDialog,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { targetUser } = await mockBase();
	await openUserScreen(targetUser.id);
	await removeUserButton.click();
	await expect(removeUserDialog).toBeVisible();
	await expectScreenshotWithSchemes("remove-confirmation-dialog.png", {
		locator: removeUserDialog,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});
