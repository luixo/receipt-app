import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./utils";

test("full screen", async ({
	page,
	mockDebts,
	expectScreenshotWithSchemes,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expectScreenshotWithSchemes("full-screen.png");
});

test("empty screen", async ({
	page,
	mockBase,
	api,
	expectScreenshotWithSchemes,
}) => {
	const { debtUser } = await mockBase();
	api.mockFirst("debts.getAllUser", { items: [] });
	api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expectScreenshotWithSchemes("empty.png");
});

test("resolved debts and divider", async ({
	page,
	mockDebts,
	expectScreenshotWithSchemes,
}) => {
	const { debtUser } = await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 1 ? 10 : -10,
			})),
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await expectScreenshotWithSchemes("resolved-and-divider.png");
});
