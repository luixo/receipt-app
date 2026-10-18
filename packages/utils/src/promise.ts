export const wait = (ms: number) =>
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
