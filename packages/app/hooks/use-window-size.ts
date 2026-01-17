import type { useWindowSize as useOriginalWindowSize } from "./use-window-size.web";

export const useWindowSize = (): ReturnType<typeof useOriginalWindowSize> => ({
	width: 0,
	height: 0,
});
