import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Role control normal, open and owner-row disabled", async ({
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRow,
	participantRows,
	participantRole,
	page,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { receipt, peers: receiptPeers } = await mockReceipt();
	const [peer] = receiptPeers;
	assert.ok(peer);
	await openReceipt(receipt);
	await openParticipantsPicker();
	await participantRow(peer.name)
		.getByRole("button", { name: /avatar/ })
		.click();
	const role = participantRole(peer.name);
	await expect(role).toBeEnabled();
	await expectScreenshotWithSchemes("role.png", {
		locator: role,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
	await role.click();
	await expectScreenshotWithSchemes("role-open.png", {
		locator: [role, page.locator('[role="dialog"] [role="listbox"]').last()],
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
	await page.keyboard.press("Escape");
	const owner = participantRows.first();
	await owner.getByRole("button", { name: /avatar/ }).click();
	const disabledRole = owner.getByRole("button", { name: "Pick role" });
	await expect(disabledRole).toHaveAttribute("data-disabled", "true");
	await expectScreenshotWithSchemes("owner-role-disabled.png", {
		locator: disabledRole,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});
