const withResolversPolyfill: (typeof Promise)["withResolvers"] = <T>() => {
	let resolve: (value: T | PromiseLike<T>) => void;
	let reject: (error: unknown) => void;
	const promise = new Promise<T>((localResolve, localReject) => {
		resolve = localResolve;
		reject = localReject;
	});
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return { promise, resolve: resolve!, reject: reject! };
};

export const withResolvers = <T>(): PromiseWithResolvers<T> => {
	/* eslint-disable n/no-unsupported-features/es-syntax */
	if (typeof Promise.withResolvers === "undefined") {
		Promise.withResolvers = withResolversPolyfill;
	} else if (Promise.withResolvers !== withResolversPolyfill) {
		throw new Error("Remove withResolvers polyfill!");
	}
	return Promise.withResolvers<T>();
	/* eslint-enable n/no-unsupported-features/es-syntax */
};
