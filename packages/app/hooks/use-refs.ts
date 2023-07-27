import React from "react";

export const useRefs = <T>() => {
	const refs = React.useRef<Record<string, T>>({});
	return React.useMemo(
		() => ({
			current: refs.current,
			setRef: (key: string) => (element: T) => {
				refs.current[key] = element;
			},
		}),
		[],
	);
};
