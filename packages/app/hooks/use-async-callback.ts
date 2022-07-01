import React from "react";

type ValueOrPromise<T> = T | Promise<T>;

export const useAsyncCallback = <
	T extends (...args: unknown[]) => ValueOrPromise<any>,
	Args extends Parameters<T> = Parameters<T>
>(
	callback: (isMount: () => boolean, ...args: Args) => ValueOrPromise<any>,
	deps: unknown[]
) => {
	const isMountedRef = React.useRef(false);
	React.useEffect(() => {
		isMountedRef.current = true;
		return () => void (isMountedRef.current = false);
	}, [isMountedRef]);

	return React.useCallback<(...args: Args) => ValueOrPromise<any>>(
		async (...args) => {
			try {
				const result = await callback(() => isMountedRef.current, ...args);
				return result;
			} catch (e) {}
		},
		[isMountedRef, ...deps]
	);
};
