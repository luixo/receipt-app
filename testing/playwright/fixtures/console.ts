import { type ConsoleMessage } from "@playwright/test";

type IgnoredPattern = string | RegExp;

export type ConsoleManager = {
	onMessage: (message: ConsoleMessage) => void;
	getMessages: () => string[];
	ignore: (pattern: IgnoredPattern) => void;
};

export const createConsoleManager = (): ConsoleManager => {
	const flatMessages: string[] = [];
	const ignored: IgnoredPattern[] = [
		// see https://github.com/nextui-org/nextui/issues/482
		"onClick is deprecated, please use onPress",
		// see https://github.com/adobe/react-spectrum/blob/fb1525eded030ad8ac8ad43d92b893d5a3256567/packages/dev/docs/pages/blog/building-a-button-part-1.mdx#L96
		"MouseEvent.mozInputSource is deprecated. Use PointerEvent.pointerType instead.",
	];
	return {
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
	};
};
