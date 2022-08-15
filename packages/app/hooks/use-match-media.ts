import React from "react";

import { media } from "app/utils/styles";

type MediaKey = keyof typeof media;
type MatchMediaObject = Record<MediaKey, boolean>;

const mediaEntries = Object.entries(media) as [MediaKey, string][];
const mediaQueryLists = mediaEntries.map(([, mediaQuery]) =>
	typeof window === "undefined" ? null : window.matchMedia(mediaQuery)
);
const getValue = (isBrowser: boolean) => (): MatchMediaObject =>
	mediaEntries.reduce((acc, [key], index) => {
		acc[key] = isBrowser ? mediaQueryLists[index]?.matches ?? false : false;
		return acc;
	}, {} as MatchMediaObject);

export const useMatchMedia = (): MatchMediaObject => {
	const [value, setValue] = React.useState(
		getValue(typeof window !== "undefined")
	);
	React.useLayoutEffect(() => {
		const handler = () => setValue(getValue(true));
		mediaQueryLists.forEach((mql) => mql!.addEventListener("change", handler));
		handler();
		return () =>
			mediaQueryLists.forEach((mql) =>
				mql!.removeEventListener("change", handler)
			);
	}, [setValue]);
	return value;
};
