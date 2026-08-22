import type { Locator } from "@playwright/test";
import { test } from "@playwright/test";

type FormFixtures = {
	fillUser: (user: { name: string }) => Promise<void>;
	changeSlider: (
		locator: Locator,
		percent: number,
		axis?: "width" | "height",
	) => Promise<void>;
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

	changeSlider: ({}, use) =>
		use(async (locator, percent, axis = "width") => {
			// Navigate from the hidden <input type="range"> up to the slider's base,
			// then find the track (which has the pointer-event listeners from React Aria).
			const track = locator
				.locator("xpath=ancestor::*[@data-slot='base'][1]")
				.locator("[data-slot='track']");
			const box = await track.boundingBox();
			if (!box) {
				throw new Error("Slider track not found or not visible");
			}
			const position =
				axis === "height"
					? // Vertical slider: top = max, bottom = min
						{ x: box.width / 2, y: box.height * (1 - percent) }
					: // Horizontal slider: left = min, right = max
						{ x: box.width * percent, y: box.height / 2 };
			await track.click({ position });
		}),
});
