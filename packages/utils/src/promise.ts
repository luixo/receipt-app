export const wait = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

export const createPromise = <R, E = unknown>() => {
	let resolve: ((result: R) => void) | undefined;
	let reject: ((reason?: E) => void) | undefined;
	const promise = new Promise<R>((resolveFn, rejectFn) => {
		resolve = resolveFn;
		reject = rejectFn;
	});
	return { resolve: resolve!, reject: reject!, wait: () => promise };
};
export type ControlledPromise<R = void, E = unknown> = ReturnType<
	typeof createPromise<R, E>
>;
