import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { getNow } from "~utils/date";

import { test } from "./utils";

test("Form", async ({
	page,
	mockBase,
	addButton,
	fillValidForm,
	expectScreenshotWithSchemes,
}) => {
	const { users } = await mockBase();
	assert(users[0]);
	const user = users[0];

	await page.goto("/debts/add");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add debt");
	await expectScreenshotWithSchemes("empty.png");

	await fillValidForm(user);
	await expect(addButton).toBeEnabled();
	await expectScreenshotWithSchemes("filled.png");
});

test.describe("Errors in form", () => {
	test("on field errors", async ({
		page,
		mockBase,
		amountInput,
		noteInput,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-biggest");
		await mockBase();

		await page.goto("/debts/add");

		await amountInput.fill("0");
		await amountInput.press("Tab");
		await expectScreenshotWithSchemes("amount-error.png", {
			locator: page.locator('[data-slot="base"]', { has: amountInput }),
		});

		// fill then clear: isDirty stays true so the error renders; Tab blurs the field
		await noteInput.fill("x");
		await noteInput.fill("");
		await noteInput.press("Tab");
		await expectScreenshotWithSchemes("note-error.png", {
			locator: page.locator('[data-slot="base"]', { has: noteInput }),
		});
	});
});

test.describe("'debts.add' mutation", () => {
	test("loading", async ({
		page,
		api,
		mockBase,
		addButton,
		fillValidForm,
		clearToasts,
		faker,
		expectScreenshotWithSchemes,
	}) => {
		const { users } = await mockBase();
		assert(users[0]);
		const user = users[0];

		const createPause = api.createPause();
		api.mockFirst("debts.add", async () => {
			await createPause.promise;
			return {
				id: faker.string.uuid(),
				updatedAt: getNow.zonedDateTime(),
				reverseAccepted: false,
			};
		});

		await page.goto("/debts/add");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Add debt",
		);
		await fillValidForm(user);
		await expect(addButton).toBeEnabled();

		await addButton.click();
		await clearToasts();
		await expectScreenshotWithSchemes("loading.png");
	});
});
