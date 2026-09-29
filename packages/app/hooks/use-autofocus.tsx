import React from "react";

import { emptyInputHandler } from "#components/input.base.tsx";
import type { InputHandler } from "#components/input.tsx";

export const useAutofocus = ({ shouldFocus }: { shouldFocus: boolean }) => {
	const ref = React.useRef<InputHandler>(emptyInputHandler);
	React.useEffect(() => {
		if (!shouldFocus) {
			return;
		}
		ref.current.focus();
	}, [shouldFocus]);
	const onKeyDownBlur = React.useCallback((key: string) => {
		if (key === "Escape" || key === "Enter") {
			ref.current.blur();
		}
	}, []);
	return { ref, onKeyDownBlur };
};
