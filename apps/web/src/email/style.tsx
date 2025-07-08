import React from "react";

import type { AugmentedProperies } from "./styling-context";
import { StylingContext } from "./styling-context";

type Props = {
	selector: string;
} & (
	| {
			styles: AugmentedProperies;
			media?: Record<string, AugmentedProperies>;
	  }
	| {
			media: Record<string, AugmentedProperies>;
	  }
);

export const Style: React.FC<Props> = ({ selector, ...props }) => {
	const mapping = React.use(StylingContext);
	if (mapping[selector]) {
		return null;
	}
	mapping[selector] =
		"styles" in props ? { default: props.styles, ...props.media } : props.media;
	return null;
};
