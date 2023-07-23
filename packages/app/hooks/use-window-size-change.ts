import React from "react";

import { useWindowSize } from "./use-window-size";

export const useWindowSizeChange = (
	effect: React.EffectCallback,
	deps: React.DependencyList = [],
) => {
	const { width, height } = useWindowSize();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(effect, [width, height, ...deps]);
};
