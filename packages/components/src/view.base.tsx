import React from "react";
// eslint-disable-next-line no-restricted-syntax
import type { View } from "react-native";

import { ScrollContext } from "~components/scroll-view";

export type ViewHandle = {
	scrollIntoView: () => void;
};

export const useScrollView = (ref?: React.Ref<ViewHandle | null>) => {
	const innerRef = React.useRef<View>(null);
	const context = React.use(ScrollContext);
	React.useImperativeHandle(
		ref,
		() => ({
			scrollIntoView: () => {
				if (!innerRef.current) {
					return;
				}
				const handle = context.getHandle();
				if (!handle) {
					return;
				}
				innerRef.current.measureLayout(handle, (x, y) =>
					context.getRef()?.scrollTo({ x, y }),
				);
			},
		}),
		[context],
	);
	return innerRef;
};
