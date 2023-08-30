import type { Level, pino } from "pino";

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
export type LoggerMock = pino.Logger & {
	getMessages: () => Message[];
};
type LevelLoggers = Record<LevelWithSilent, pino.LogFn>;
export const getLogger = (
	bindings: pino.Bindings = {},
	messagesHandler: Message[] = [],
): LoggerMock => {
	const messages: Message[] = messagesHandler;
	// see https://github.com/pinojs/pino/blob/master/docs/api.md#optionslevel-string
	let innerLevel: number = LEVELS.info;
	const levels = Object.entries(LEVELS).reduce<LevelLoggers>(
		(acc, [levelKey, levelValue]) => ({
			...acc,
			[levelKey]: (...args: unknown[]) => {
				const values: Message = [levelValue, ...args];
				if (Object.keys(bindings).length !== 0) {
					values.splice(1, 0, bindings);
				}
				messages.push(values);
			},
		}),
		{} as LevelLoggers,
	);
	return {
		get level() {
			return Object.entries(LEVELS).find(
				([, levelValue]) => innerLevel === levelValue,
			)![0];
		},
		set level(value) {
			innerLevel = LEVELS[value as LevelWithSilent];
		},
		...levels,
		getMessages: () =>
			messages
				.filter(([levelValue]) => levelValue >= innerLevel)
				.map(([, ...rest]) => rest),
		child: (childBindings) =>
			getLogger({ ...bindings, ...childBindings }, messages) as pino.Logger,
	} as LoggerMock;
};
