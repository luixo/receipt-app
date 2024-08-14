import type { Level, pino } from "pino";
import { entries, keys, mapValues } from "remeda";

import type { Tail } from "~utils/types";

type LevelWithSilent = Level | "silent";

// see https://github.com/pinojs/pino/blob/master/docs/api.md#loggerlevel-string-gettersetter
const LEVELS: Record<LevelWithSilent, number> = {
	silent: Infinity,
	fatal: 60,
	error: 50,
	warn: 40,
	info: 30,
	debug: 20,
	trace: 10,
};
type Message = [number, ...unknown[]];
type MessagesHandler = {
	addMessage: (message: Message) => void;
	getMessages: () => Message[];
	resetMessages: () => void;
};
const createMessagesHandler = (): MessagesHandler => {
	let messages: Message[] = [];
	return {
		addMessage: (message: Message) => {
			messages.push(message);
		},
		getMessages: () => messages,
		resetMessages: () => {
			messages = [];
		},
	};
};
export type LoggerMock = pino.Logger & {
	getMessages: () => Tail<Message>[];
	resetMessages: () => void;
};
export const getLogger = (
	bindings: pino.Bindings = {},
	messagesHandler: MessagesHandler = createMessagesHandler(),
): LoggerMock => {
	// see https://github.com/pinojs/pino/blob/master/docs/api.md#optionslevel-string
	let innerLevel: number = LEVELS.info;
	const levels = mapValues(LEVELS, (levelValue) => (...args: unknown[]) => {
		const values: Message = [levelValue, ...args];
		if (keys(bindings).length !== 0) {
			values.splice(1, 0, bindings);
		}
		messagesHandler.addMessage(values);
	});
	return {
		get level() {
			const matchedLevel = entries(LEVELS).find(
				([, levelValue]) => innerLevel === levelValue,
			);
			if (!matchedLevel) {
				throw new Error(`Unexpected inner level ${innerLevel}`);
			}
			return matchedLevel[0];
		},
		set level(value) {
			innerLevel = LEVELS[value];
		},
		...levels,
		getMessages: () =>
			messagesHandler
				.getMessages()
				.filter(([levelValue]) => levelValue >= innerLevel)
				.map(([, ...rest]) => rest),
		resetMessages: () => {
			messagesHandler.resetMessages();
		},
		child: (childBindings) =>
			getLogger(
				{ ...bindings, ...childBindings },
				messagesHandler,
			) as pino.Logger,
	} as LoggerMock;
};
