import { mergeTests } from "@playwright/test";

import { consoleFixtures } from "./console";
import { pageFixtures } from "./page";

const test = mergeTests(pageFixtures, consoleFixtures);

type TelegramFixtures = {
	injectTelegramInitData: (initData?: string) => Promise<void>;
	ignoreTelegramConsoleNoise: void;
};

const DEFAULT_TEST_INIT_DATA = "auth_date=1&user=%7B%7D&hash=test";

export const telegramFixtures = test.extend<TelegramFixtures>({
	// Outside a real Telegram client the official `telegram-web-app.js`
	// script (loaded on the bot-link page regardless of test setup) can't
	// reach a WebView host, so it logs a handful of harmless bridge/parse
	// errors while it gives up - expected noise, not under our control.
	ignoreTelegramConsoleNoise: [
		async ({ consoleManager }, use) => {
			consoleManager.ignore(/\[Telegram\.WebView]/);
			consoleManager.ignore(/Failed to parse JSON/);
			await use();
		},
		{ auto: true },
	],

	injectTelegramInitData: ({ page }, use) =>
		use(async (initData = DEFAULT_TEST_INIT_DATA) => {
			// The real script overwrites `window.Telegram.WebApp` once it loads
			// (based on a real bridge that doesn't exist here), so it's replaced
			// with a no-op response for the injected stub below to stick. A
			// no-op (rather than an aborted request) avoids a load-failure
			// console error tripping the no-console-noise check.
			await page.route("https://telegram.org/js/telegram-web-app.js", (route) =>
				route.fulfill({ contentType: "application/javascript", body: "" }),
			);
			await page.addInitScript<[string]>(
				([data]) => {
					Object.assign(window, { Telegram: { WebApp: { initData: data } } });
				},
				[initData],
			);
		}),
});
