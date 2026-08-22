import { test } from "@playwright/test";

type FormFixtures = {
	fillUser: (user: { name: string }) => Promise<void>;
};

export const formFixtures = test.extend<FormFixtures>({
	fillUser: ({ page }, use) =>
		use(async (user) => {
			await page.getByRole("combobox", { name: "Select a user" }).click();
			await page
				.getByRole("option")
				.filter({ has: page.getByText(user.name, { exact: true }) })
				.click();
		}),
});
