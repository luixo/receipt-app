import React from "react";

import { entries, fromEntries } from "remeda";

import { useWindowSize } from "~app/hooks/use-window-size";
import { screens } from "~app/utils/styles";

const DEFAULT_WIDTH = 720;

export const useMediaSize = () => {
	const { width = DEFAULT_WIDTH } = useWindowSize();
	return React.useMemo(() => {
		const mediaSizes = fromEntries(
			entries(screens).flatMap(([size, value]) => [
				[`${size}Max`, value >= width] as const,
				[`${size}Min`, value <= width] as const,
			]),
		);
		return mediaSizes as Required<typeof mediaSizes>;
	}, [width]);
};
