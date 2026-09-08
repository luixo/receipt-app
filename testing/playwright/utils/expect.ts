import type { MaybePromise } from "~utils/types";

export const expectSubscribe = async <T>(
	subscribe: (
		onData: (data: T) => void,
	) => MaybePromise<() => MaybePromise<void>>,
	isValid: (values: T) => boolean,
	{
		timeout = 5000,
		message = (lastValue) => `Invalid value: ${JSON.stringify(lastValue)}`,
	}: { timeout?: number; message?: (lastValue: T | undefined) => string } = {},
): Promise<T> => {
	let timeoutId = -1;
	let lastValue: T | undefined = undefined;
	const { promise, resolve } =
		Promise.withResolvers<[boolean, T | undefined]>();
	const unsubscribe = await subscribe((data) => {
		lastValue = data;
		if (isValid(data)) {
			clearTimeout(timeoutId);
			resolve([true, data]);
		}
	});
	timeoutId = setTimeout(() => {
		resolve([false, lastValue]);
	}, timeout);
	const [success, value] = await promise;
	await unsubscribe();
	if (!success) {
		throw new Error(message(value));
	}
	// oxlint-disable-next-line typescript/no-non-null-assertion
	return value!;
};
