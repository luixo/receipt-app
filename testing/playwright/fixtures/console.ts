import { type ConsoleMessage, expect, test } from "@playwright/test";
import colors from "colors";

type IgnoredPattern = string | RegExp;

export const DEFAULT_IGNORED: IgnoredPattern[] = [
	// Router options are currently passed to DOM in HeroUI (TODO: open a PR)
	/routerOptions/,
];

export const isIgnored = (patterns: IgnoredPattern[], message: string) =>
	patterns.some((ignoredElement) =>
		typeof ignoredElement === "string"
			? message.includes(ignoredElement)
			: message.match(ignoredElement),
	);

const DEFAULT_CLIENT_IGNORED: IgnoredPattern[] = [
	...DEFAULT_IGNORED,
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
	// Will be fixed later!
	/A text node cannot be a child of a <View>/,
	// Sometimes happens in tests, doesn't seem to affect anything
	/net::ERR_SSL_PROTOCOL_ERROR/,
	// Sometimes happens in tests, doesn't seem to affect anything
	/Error reading data from TLS socket/,
	// Sometimes happens in tests, doesn't seem to affect anything
	/The resource .* was preloaded using link preload but not used within a few seconds from the window's load event/,
	// Will be fixed later!
	"If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute for accessibility",
];

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
		const ignored = [...DEFAULT_CLIENT_IGNORED];
		await use({
			onMessage: (message) => {
				const text = message.text();
				if (isIgnored(ignored, text)) {
					return;
				}
				flatMessages.push(
					`${colors.magenta(`[${message.type()}]`)} ${message.text()}`,
				);
			},
			getMessages: () => flatMessages,
			ignore: (pattern) => {
				ignored.push(pattern);
			},
		});
	},
	autoVerifyNoConsoleMessages: [
		async ({ page, consoleManager }, use, testInfo) => {
			if (testInfo.project.name !== "functional") {
				await use();
				return;
			}
			page.on("console", consoleManager.onMessage);
			await use();
			expect.soft(consoleManager.getMessages()).toStrictEqual([]);
		},
		{ auto: true },
	],
});
