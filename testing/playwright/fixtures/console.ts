import { type ConsoleMessage, expect } from "@playwright/test";

import { createMixin } from "./utils";

type IgnoredPattern = string | RegExp;

type ConsoleManager = {
	onMessage: (message: ConsoleMessage) => void;
	getMessages: () => string[];
	ignore: (pattern: IgnoredPattern) => void;
};

type ConsoleMixin = {
	consoleManager: ConsoleManager;
	autoVerifyNoConsoleMessages: void;
};

export const consoleMixin = createMixin<ConsoleMixin>({
	// eslint-disable-next-line no-empty-pattern
	consoleManager: async ({}, use) => {
		const flatMessages: string[] = [];
		const ignored: IgnoredPattern[] = [
			// see https://github.com/adobe/react-spectrum/blob/fb1525eded030ad8ac8ad43d92b893d5a3256567/packages/dev/docs/pages/blog/building-a-button-part-1.mdx#L96
			"MouseEvent.mozInputSource is deprecated. Use PointerEvent.pointerType instead.",
			"Cannot record touch end without a touch start.",
		];
		await use({
			onMessage: (message) => {
				const text = message.text();
				if (
					ignored.some((ignoredElement) =>
						typeof ignoredElement === "string"
							? text.includes(ignoredElement)
							: text.match(ignoredElement),
					)
				) {
					return;
				}
				flatMessages.push(`[${message.type()}] ${message.text()}`);
			},
			getMessages: () => flatMessages,
			ignore: (pattern) => {
				ignored.push(pattern);
			},
		});
	},
	autoVerifyNoConsoleMessages: [
		async ({ page, consoleManager }, use) => {
			page.on("console", consoleManager.onMessage);
			await use();
			if (process.env.CI) {
				expect.soft(consoleManager.getMessages()).toStrictEqual([]);
			}
		},
		{ auto: true },
	],
});
