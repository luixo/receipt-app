import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebtsFromReceipt } from "~tests/frontend/generators/debts";

import { mockPeerReceipts, test } from "./utils";

test("Default state", async ({
	mockBase,
	openPeerScreen,
	expectScreenshotWithSchemes,
}) => {
	const { targetPeer } = await mockBase();
	await openPeerScreen(targetPeer.id);
	await expectScreenshotWithSchemes("default-state.png");
});

test("Filled state", async ({
	api,
	faker,
	mockBase,
	openPeerScreen,
	connectionEmailInput,
	expectScreenshotWithSchemes,
}) => {
	const { targetPeer } = await mockBase();
	api.mockFirst("peers.get", ({ input, next }) => {
		if (input.id !== targetPeer.id) {
			return next();
		}
		return {
			...targetPeer,
			publicName: "Public nickname",
			connectedAccount: {
				id: faker.string.uuid(),
				email: "connected@example.com",
				avatarUrl: undefined,
			},
		};
	});
	await openPeerScreen(targetPeer.id);
	await expect(connectionEmailInput).toHaveValue("connected@example.com");
	await expectScreenshotWithSchemes("filled-state.png");
});

test("With receipts", async ({
	mockBase,
	openPeerScreen,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	api,
	faker,
	fromUnitToSubunit,
	fromSubunitToUnit,
	peerReceiptPreview,
}) => {
	const { targetPeer, selfPeer } = await mockBase();
	mockPeerReceipts({
		api,
		faker,
		fromUnitToSubunit,
		fromSubunitToUnit,
		targetPeer,
		selfPeer,
		amount: 2,
		generateDebts: defaultGenerateDebtsFromReceipt,
	});
	await openPeerScreen(targetPeer.id);
	await awaitCacheKey("receipts.getByPeerPaged");
	await awaitCacheKey("receipts.get", 2);
	await expect(peerReceiptPreview).toHaveCount(2);
	await expectScreenshotWithSchemes("with-receipts.png");
});

test("Connection form open", async ({
	mockBase,
	openPeerScreen,
	connectButton,
	connectionEmailInput,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { targetPeer } = await mockBase();
	await openPeerScreen(targetPeer.id);
	await connectButton.click();
	await expect(connectionEmailInput).toBeVisible();
	await expectScreenshotWithSchemes("connection-form-open.png");
});

test("Remove confirmation dialog", async ({
	mockBase,
	openPeerScreen,
	removePeerButton,
	removePeerDialog,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { targetPeer } = await mockBase();
	await openPeerScreen(targetPeer.id);
	await removePeerButton.click();
	await expect(removePeerDialog).toBeVisible();
	await expectScreenshotWithSchemes("remove-confirmation-dialog.png", {
		locator: removePeerDialog,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});
