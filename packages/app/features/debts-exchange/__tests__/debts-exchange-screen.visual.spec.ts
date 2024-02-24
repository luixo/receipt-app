import { test } from "./utils";

test("Screen", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	user: userSelector,
	debtsGroup,
}) => {
	const { user } = mockDebts();
	await openDebtsExchangeScreen(user.id);
	await expectScreenshotWithSchemes("wrapper.png", {
		mask: [debtsGroup, userSelector],
	});
});
