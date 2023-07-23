import React from "react";

export const useBooleanState = (initialValue = false) => {
	const [value, setValue] = React.useState(initialValue);
	const setTrue = React.useCallback(() => setValue(true), [setValue]);
	const setFalse = React.useCallback(() => setValue(false), [setValue]);
	const switchValue = React.useCallback(
		() => setValue((prev) => !prev),
		[setValue],
	);
	return [value, { setTrue, setFalse, switchValue }] as const;
};
