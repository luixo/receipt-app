import { test } from "./outbound-connection-intention.utils";

test("Row", async ({
	page,
	mockConnectionIntentions,
	openConnectionIntentions,
	expectScreenshotWithSchemes,
}) => {
	await mockConnectionIntentions({ outboundAmount: 1 });
	await openConnectionIntentions();
	await expectScreenshotWithSchemes("row.png", {
		locator: page.getByTestId("outbound-connection-intention"),
	});
});
