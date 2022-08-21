import React from "react";

import { useIsomorphicLayoutEffect } from "app/hooks/use-isomorphic-layout-effect";
import { media } from "app/utils/styles";

type MediaKey = keyof typeof media;
type MatchMediaObject = Record<MediaKey, boolean>;

const mediaEntries = Object.entries(media) as [MediaKey, string][];
const mediaQueryLists = mediaEntries.map(([, mediaQuery]) =>
	typeof window === "undefined" ? null : window.matchMedia(mediaQuery)
);
const getValue = (defaultValues: boolean) => (): MatchMediaObject =>
	mediaEntries.reduce((acc, [key], index) => {
		acc[key] = defaultValues ? false : mediaQueryLists[index]?.matches ?? false;
		return acc;
	}, {} as MatchMediaObject);

export const useMatchMedia = (): MatchMediaObject => {
	const [value, setValue] = React.useState(getValue(true));
	useIsomorphicLayoutEffect(() => {
		const handler = () => setValue(getValue(false));
		mediaQueryLists.forEach((mql) => mql!.addEventListener("change", handler));
		handler();
		return () =>
			mediaQueryLists.forEach((mql) =>
				mql!.removeEventListener("change", handler)
			);
	}, [setValue]);
	return value;
};
