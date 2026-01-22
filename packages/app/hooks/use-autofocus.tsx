import React from "react";

import type { InputHandler } from "~components/input";
import { emptyInputHandler } from "~components/input.base";

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
