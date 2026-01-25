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
	React.useImperativeHandle(ref, () => {
		const scrollIntoView = () => {
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
		};
		if (!innerRef.current) {
			return { scrollIntoView };
		}
		// This is needed for Trigger components in web version to hook into child views
		const viewHandle = innerRef.current as unknown as ViewHandle;
		viewHandle.scrollIntoView = scrollIntoView;
		return viewHandle;
	}, [context]);
	return innerRef;
};
