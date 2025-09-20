import React from "react";

export const useAutofocus = <T extends HTMLElement>({
	shouldFocus,
}: {
	shouldFocus: boolean;
}) => {
	const ref = React.useRef<T>(null);
	React.useEffect(() => {
		if (!shouldFocus || !ref.current) {
			return;
		}
		ref.current.focus();
	}, [shouldFocus]);
	const onKeyDownBlur = React.useCallback<
		React.KeyboardEventHandler<HTMLInputElement>
	>((event) => {
		if (event.key === "Escape" || event.key === "Enter") {
			event.currentTarget.blur();
		}
	}, []);
	return { ref, onKeyDownBlur };
};
