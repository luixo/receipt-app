import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test as localTest } from "./debts-screen.utils";

const test = mergeTests(localTest, debtsGroupFixture);

test("Full screen with debts", async ({
	mockDebts,
	page,
	awaitCacheKey,
	expectScreenshotWithSchemes,
	faker,
}) => {
	const firstUserId = faker.string.uuid();
	const { users } = await mockDebts({
		generateUsers: (opts) => {
			const [firstUser, ...generatedUsers] = defaultGenerateUsers(opts);
			assert.ok(firstUser);
			return [{ ...firstUser, id: firstUserId }, ...generatedUsers.slice(1)];
		},
		generateDebts: (opts) =>
			defaultGenerateDebts(
				opts.userId === firstUserId ? { ...opts, amount: 0 } : opts,
			),
	});
	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getAll");
	await awaitCacheKey("debts.getUsersPaged");
	await awaitCacheKey("debts.getAllUser", { success: users.length });
	await expectScreenshotWithSchemes("full-screen.png");
});

test("Full screen with no debts", async ({
	page,
	mockDebts,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	const { users } = await mockDebts({
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 0 }),
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getAll");
	await awaitCacheKey("debts.getUsersPaged");
	await awaitCacheKey("debts.getAllUser", { success: users.length });
	await expectScreenshotWithSchemes("empty.png");
});

test("Show resolved debts toggle", async ({
	page,
	mockDebts,
	expectScreenshotWithSchemes,
	showResolvedDebtsSwitch,
	debtsGroup,
	awaitCacheKey,
}) => {
	await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 0 ? 0 : debt.amount,
			})),
	});
	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getAll");

	await expectScreenshotWithSchemes("resolved-hidden.png", {
		locator: debtsGroup.first(),
	});

	await showResolvedDebtsSwitch.click();
	await awaitCacheKey("debts.getAll", { success: 1 });

	await expectScreenshotWithSchemes("resolved-shown.png", {
		locator: debtsGroup.first(),
	});
});

test("Loading state", async ({
	page,
	api,
	faker,
	mockBase,
	expectScreenshotWithSchemes,
	skeleton,
}) => {
	// oxlint-disable-next-line playwright/no-skipped-test
	test.skip(
		true,
		"We prefetch this query completely so loading state will hang it forever",
	);
	await mockBase();

	const pause = api.createPause();
	api.mockFirst("debts.getUsersPaged", async () => {
		await pause.promise;
		return { count: 1, cursor: 0, items: [faker.string.uuid()] };
	});

	await page.navigate({ to: "/debts" });

	await expect(skeleton).toBeVisible();
	await expectScreenshotWithSchemes("loading.png");
});

test("Error state", async ({
	page,
	api,
	mockBase,
	expectScreenshotWithSchemes,
	errorMessage,
	awaitCacheKey,
}) => {
	await mockBase();
	api.mockFirst("debts.getAllUser", { items: [] });
	const mockErrorMessage = `Mock "getUsersPaged" error`;
	api.mockFirst("debts.getUsersPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });
	api.mockFirst("accountSettings.get", { manualAcceptDebts: false });

	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getUsersPaged", { error: 1 });

	await expect(errorMessage(mockErrorMessage)).toBeVisible();
	await expectScreenshotWithSchemes("error.png");
});
