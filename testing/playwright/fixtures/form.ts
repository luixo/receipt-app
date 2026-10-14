import type { Locator } from "@playwright/test";
import { test } from "@playwright/test";

type FormFixtures = {
	fillPeer: (peer: { name: string }) => Promise<void>;
	changeSlider: (locator: Locator, percent: number) => Promise<void>;
};

export const formFixtures = test.extend<FormFixtures>({
	fillPeer: ({ page }, use) =>
		use(async (peer) => {
			await page.getByRole("textbox", { name: "Select a peer" }).click();
			await page
				.getByRole("option")
				.filter({ has: page.getByText(peer.name, { exact: true }) })
				.click();
		}),

	changeSlider: ({}, use) =>
		use(async (locator, percent) => {
			const min = Number(await locator.getAttribute("min"));
			const max = Number(await locator.getAttribute("max"));
			const step = Number(await locator.getAttribute("step"));
			const steps = Math.round(((max - min) * percent) / step);
			await locator.press("Home");
			for (let index = 0; index < steps; index += 1) {
				await locator.press("ArrowUp");
			}
		}),
});
