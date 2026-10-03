import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateReceipt } from "~tests/frontend/generators/receipts";

import { test } from "./utils";

test("Empty owner preview and picker", async ({
	mockReceipt,
	openReceipt,
	participantsPreview,
	participantsPicker,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt({
		generateReceiptParticipants: () => [],
	});
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("empty-preview.png", {
		locator: participantsPreview,
	});
	await participantsPreview.click();
	await expect(participantsPicker).toBeVisible();
	await expectScreenshotWithSchemes("empty-owner-picker.png", {
		locator: participantsPicker,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Populated owner picker masks participant rows", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	populatedParticipantsPreview,
	participantsPicker,
	participantRows,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt } = await mockReceipt();
	await openReceipt(receipt);
	await expectScreenshotWithSchemes("populated-preview.png", {
		locator: populatedParticipantsPreview,
	});
	await openParticipantsPicker();
	await expect(participantRows.first()).toBeVisible();
	await expectScreenshotWithSchemes("owner-picker.png", {
		locator: participantsPicker,
		mask: [participantRows],
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Empty guest picker", async ({
	api,
	faker,
	mockReceipt,
	openReceipt,
	participantsPreview,
	participantsPicker,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const owner = {
		id: faker.string.uuid(),
		name: "Receipt owner",
		publicName: undefined,
		connectedUser: undefined,
	};
	api.mockUtils.mockPeers(owner);
	const { receipt } = await mockReceipt({
		generateReceiptParticipants: () => [],
		generateReceipt: (opts) => ({
			...defaultGenerateReceipt(opts),
			ownerPeerId: owner.id,
			debts: {
				direction: "incoming",
				id: undefined,
				hasMine: false,
				hasForeign: false,
			},
		}),
	});
	await openReceipt(receipt);
	await participantsPreview.click();
	await expect(participantsPicker).toBeVisible();
	await expectScreenshotWithSchemes("empty-guest-picker.png", {
		locator: participantsPicker,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});
