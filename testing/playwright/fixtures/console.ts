import { expect } from "@playwright/test";
import colors from "colors";

import { serverFixtures as test } from "./server";

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
	// Happens while running on dev, fix later
	/React does not recognize the `%s` prop on a DOM element/,
];

const DEFAULT_SERVER_IGNORED = DEFAULT_IGNORED;

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
		async ({ page, consoleManager, serverClient }, use, testInfo) => {
			if (testInfo.project.name !== "functional") {
				await use();
				return;
			}
			await use();
			const clientMessages = await page.consoleMessages();
			const serverMessages = await serverClient.getTestErrors.query({
				testId: testInfo.testId,
			});
			const messages = [
				...clientMessages.map((message) => ({
					kind: "client",
					type: message.type(),
					text: message.text(),
				})),
				...serverMessages.map((entry) => ({
					kind: "server",
					type: entry.type,
					text: entry.text,
				})),
			];
			const clientIgnored = [
				...DEFAULT_CLIENT_IGNORED,
				...consoleManager.getIgnored(),
			];
			const serverIgnored = [
				...DEFAULT_SERVER_IGNORED,
				...consoleManager.getIgnored(),
			];
			expect
				.soft(
					messages
						.map(({ kind, text, type }) => {
							if (
								isIgnored(
									kind === "client" ? clientIgnored : serverIgnored,
									text,
								)
							) {
								return undefined;
							}
							return `${colors.magenta(`[${kind}][${type}]`)} ${text}`;
						})
						.filter(Boolean),
				)
				.toStrictEqual([]);
		},
		{ auto: true },
	],
});
