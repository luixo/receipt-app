import { type ConsoleMessage, expect, test } from "@playwright/test";

type IgnoredPattern = string | RegExp;

type ConsoleManager = {
	onMessage: (message: ConsoleMessage) => void;
	getMessages: () => string[];
	ignore: (pattern: IgnoredPattern) => void;
};

type ConsoleFixtures = {
	consoleManager: ConsoleManager;
	autoVerifyNoConsoleMessages: void;
};

export const consoleFixtures = test.extend<ConsoleFixtures>({
	consoleManager: async ({}, use) => {
		const flatMessages: string[] = [];
		const ignored: IgnoredPattern[] = [
			// see https://github.com/adobe/react-spectrum/blob/fb1525eded030ad8ac8ad43d92b893d5a3256567/packages/dev/docs/pages/blog/building-a-button-part-1.mdx#L96
			"MouseEvent.mozInputSource is deprecated. Use PointerEvent.pointerType instead.",
			"Cannot record touch end without a touch start.",
			// TODO: find out what forms cause this and how to remove the warning
			// See https://github.com/luixo/receipt-app/commit/4c7597344d97d60c49f08f7261a73a9df57a056b
			"WARN: A component changed from uncontrolled to controlled.",
			// SSR-injected initial data
			/Injected From Server/,
			// Vite debug data
			/\[vite\]/,
			// React DevTools info
			/React DevTools/,
			// Router options are currently passed to DOM in HeroUI (TODO: open a PR)
			/routerOptions routeroptions/,
			// Will be fixed later!
			/A text node cannot be a child of a <View>/,
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
			expect.soft(consoleManager.getMessages()).toStrictEqual([]);
		},
		{ auto: true },
	],
});
