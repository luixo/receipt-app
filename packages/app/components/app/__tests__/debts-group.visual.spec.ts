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
	const { debtUser } = mockDebts({
		generateDebts: () => [],
	});
	await openUserDebtsScreen(debtUser.id);
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
	const { debtUser } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openUserDebtsScreen(debtUser.id, { awaitDebts: 1 });
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
	const { debtUser } = mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: AMOUNT }),
	});
	await openUserDebtsScreen(debtUser.id, { awaitDebts: AMOUNT });
	await expectScreenshotWithSchemes("multiple.png", {
		locator: debtsGroup,
	});
});

test.describe("External query status", () => {
	test("loading", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		debtsGroup,
		expectScreenshotWithSchemes,
	}) => {
		const { debtUser, debts } = mockDebts({
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
		});
		const debtPause = api.createPause();
		api.mockFirst("debts.get", async ({ input: { id }, next }) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (id === debts[0]!.id) {
				await debtPause.promise;
			}
			return next();
		});
		await openUserDebtsScreen(debtUser.id);
		await expectScreenshotWithSchemes("external-loading.png", {
			locator: debtsGroup,
		});
	});

	test("error", async ({
		api,
		mockDebts,
		openUserDebtsScreen,
		debtsGroup,
		expectScreenshotWithSchemes,
	}) => {
		const { debtUser, debts } = mockDebts({
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
		});
		api.mockFirst("debts.get", async ({ input: { id }, next }) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (id === debts[0]!.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Mock "debts.get" error`,
				});
			}
			return next();
		});
		await openUserDebtsScreen(debtUser.id);
		await expectScreenshotWithSchemes("external-error.png", {
			locator: debtsGroup,
		});
	});
});
