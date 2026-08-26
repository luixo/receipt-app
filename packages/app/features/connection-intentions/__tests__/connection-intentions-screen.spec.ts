import { expect } from "~tests/frontend/fixtures";

import { test } from "./connection-intentions-screen.utils";

test("Page header", async ({
	page,
	mockConnectionIntentions,
	openConnectionIntentions,
	backLink,
}) => {
	await mockConnectionIntentions();
	await openConnectionIntentions();
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Connection intentions",
	);
	await backLink.click();
	await expect(page).toHaveURL("/users");
});

test("Empty state", async ({
	mockConnectionIntentions,
	openConnectionIntentions,
	emptyCard,
	inboundHeading,
	outboundHeading,
}) => {
	await mockConnectionIntentions();
	await openConnectionIntentions();
	await expect(emptyCard("All done 👍")).toBeVisible();
	await expect(inboundHeading).not.toBeAttached();
	await expect(outboundHeading).not.toBeAttached();
});

test("Inbound only", async ({
	faker,
	mockConnectionIntentions,
	openConnectionIntentions,
	emptyCard,
	inboundHeading,
	outboundHeading,
	inboundRows,
}) => {
	const inboundAmount = faker.number.int({ min: 2, max: 4 });
	await mockConnectionIntentions({ inboundAmount });
	await openConnectionIntentions();
	await expect(inboundHeading).toBeVisible();
	await expect(inboundRows).toHaveCount(inboundAmount);
	await expect(outboundHeading).not.toBeAttached();
	await expect(emptyCard()).not.toBeAttached();
});

test("Outbound only", async ({
	faker,
	mockConnectionIntentions,
	openConnectionIntentions,
	emptyCard,
	inboundHeading,
	outboundHeading,
	outboundRows,
}) => {
	const outboundAmount = faker.number.int({ min: 2, max: 4 });
	await mockConnectionIntentions({ outboundAmount });
	await openConnectionIntentions();
	await expect(outboundHeading).toBeVisible();
	await expect(outboundRows).toHaveCount(outboundAmount);
	await expect(inboundHeading).not.toBeAttached();
	await expect(emptyCard()).not.toBeAttached();
});

test("Mixed inbound and outbound", async ({
	page,
	faker,
	mockConnectionIntentions,
	openConnectionIntentions,
	inboundHeading,
	outboundHeading,
	inboundRows,
	outboundRows,
}) => {
	const inboundAmount = faker.number.int({ min: 2, max: 4 });
	const outboundAmount = faker.number.int({ min: 2, max: 4 });
	await mockConnectionIntentions({ inboundAmount, outboundAmount });
	await openConnectionIntentions();
	await expect(inboundHeading).toBeVisible();
	await expect(outboundHeading).toBeVisible();
	await expect(inboundRows).toHaveCount(inboundAmount);
	await expect(outboundRows).toHaveCount(outboundAmount);
	await expect(page.getByRole("heading", { level: 3 })).toHaveText([
		"Inbound connections",
		"Outbound connections",
	]);
});
