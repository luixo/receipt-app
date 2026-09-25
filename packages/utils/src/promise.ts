export const wait = (ms: number) =>
	// This is the only place with new Promise
	// oxlint-disable-next-line promise/avoid-new
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

type Unsubscribe = () => void;

export const promisifyEvent = <T = void>(
	subscribe: (
		listener: (result: T) => void,
		errorListener: (error: Error) => void,
	) => Unsubscribe | void,
) =>
	// This is the only place with new Promise
	// oxlint-disable-next-line promise/avoid-new
	new Promise<T>((resolve, reject) => {
		const unsubscribe = subscribe(
			(result) => {
				unsubscribe?.();
				resolve(result);
			},
			(error) => {
				unsubscribe?.();
				reject(error);
			},
		);
	});
