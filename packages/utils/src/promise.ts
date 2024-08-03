import { noop } from "~utils/misc";

export const wait = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

export const createPromise = <R, E = unknown>() => {
	let resolve: (result: R) => void = noop;
	let reject: (reason?: E) => void = noop;
	const promise = new Promise<R>((resolveFn, rejectFn) => {
		resolve = resolveFn;
		reject = rejectFn;
	});
	return { resolve, reject, wait: () => promise };
};
export type ControlledPromise<R = void, E = unknown> = ReturnType<
	typeof createPromise<R, E>
>;
