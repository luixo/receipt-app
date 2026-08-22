import { expect, test } from "@playwright/test";
import colors from "colors";

type IgnoredPattern = string | RegExp;

export const DEFAULT_IGNORED: IgnoredPattern[] = [];

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
	// Happens while running on dev
	/Refused to apply style from .* because its MIME type .* is not a supported stylesheet MIME type, and strict MIME checking is enabled./,
];

type ConsoleFixtures = {
	autoVerifyNoConsoleMessages: void;
	consoleManager: {
		ignore: (pattern: IgnoredPattern) => void;
		getIgnored: () => IgnoredPattern[];
	};
};

export const consoleFixtures = test.extend<ConsoleFixtures>({
	consoleManager: async ({}, use) => {
		const ignored: IgnoredPattern[] = [];
		await use({
			getIgnored: () => ignored,
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
			await use();
			const messages = await page.consoleMessages();
			const ignored = [
				...DEFAULT_CLIENT_IGNORED,
				...consoleManager.getIgnored(),
			];
			expect
				.soft(
					messages
						.map(({ text, type }) => {
							if (isIgnored(ignored, text())) {
								return;
							}
							return `${colors.magenta(`[${type()}]`)} ${text()}`;
						})
						.filter(Boolean),
				)
				.toStrictEqual([]);
		},
		{ auto: true },
	],
});
