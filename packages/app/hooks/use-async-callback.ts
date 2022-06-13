import React from "react";

type ValueOrPromise<T> = T | Promise<T>;

export const useAsyncCallback = <
	T extends (...args: unknown[]) => ValueOrPromise<any>,
	Args extends Parameters<T> = Parameters<T>
>(
	callback: (isMount: () => boolean, ...args: Args) => ValueOrPromise<any>,
	deps: unknown[]
) => {
	const [mount, setMount] = React.useState(false);
	React.useEffect(() => {
		setMount(true);
		return () => setMount(false);
	}, [setMount]);
	const isMountRef = React.useRef(() => mount);
	return React.useCallback<(...args: Args) => ValueOrPromise<any>>(
		async (...args) => {
			try {
				const result = await callback(isMountRef.current, ...args);
				return result;
			} catch (e) {}
		},
		[isMountRef, ...deps]
	);
};
