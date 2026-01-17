import { useWindowDimensions } from "react-native";

import type { useWindowSize as useOriginalWindowSize } from "./use-window-size.web";

export const useWindowSize = (): ReturnType<typeof useOriginalWindowSize> => {
	const { width, height } = useWindowDimensions();
	return { width, height };
};
