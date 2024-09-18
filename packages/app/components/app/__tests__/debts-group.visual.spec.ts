import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

test("No debts", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { user } = mockDebts({
		generateDebts: () => [],
	});
	await openUserDebtsScreen(user.id);
	await expectScreenshotWithSchemes("empty.png", {
		locator: debtsGroup,
	});
});

test("Single group", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const { user } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openUserDebtsScreen(user.id, { awaitDebts: 1 });
	await expectScreenshotWithSchemes("single.png", {
		locator: debtsGroup,
	});
});

test("Multiple groups with different directions", async ({
	openUserDebtsScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	debtsGroup,
}) => {
	const AMOUNT = 20;
	const { user } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: AMOUNT }),
	});
	await openUserDebtsScreen(user.id, { awaitDebts: AMOUNT });
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});

test("External query status", async ({
	api,
	mockDebts,
	openUserDebtsScreen,
	debtsGroup,
	expectScreenshotWithSchemes,
}) => {
	const { user, debts } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
	});
	const debtPause = api.createPause();
	api.mock("debts.get", async ({ input: { id }, next }) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (id === debts[0]!.id) {
			await debtPause.promise;
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (id === debts[1]!.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error`,
			});
		}
		return next();
	});
	await openUserDebtsScreen(user.id);
	await expectScreenshotWithSchemes("external-status.png", {
		locator: debtsGroup,
	});
});
