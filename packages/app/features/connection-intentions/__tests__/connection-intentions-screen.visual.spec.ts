import { test } from "./connection-intentions-screen.utils";

test("Empty state", async ({
	mockConnectionIntentions,
	openConnectionIntentions,
	expectScreenshotWithSchemes,
}) => {
	await mockConnectionIntentions();
	await openConnectionIntentions();
	await expectScreenshotWithSchemes("empty.png");
});

test("Mixed connections", async ({
	mockConnectionIntentions,
	openConnectionIntentions,
	expectScreenshotWithSchemes,
	inboundRows,
	outboundRows,
}) => {
	await mockConnectionIntentions({ inboundAmount: 2, outboundAmount: 2 });
	await openConnectionIntentions();
	await expectScreenshotWithSchemes("mixed.png", {
		mask: [inboundRows, outboundRows],
	});
});
