import React from "react";

import type { AugmentedProperies } from "./styling-context";
import { StylingContext } from "./styling-context";

type Props = {
	selector: string;
	styles?: AugmentedProperies;
	media?: Record<string, AugmentedProperies>;
};

export const Style: React.FC<Props> = ({ selector, styles, media }) => {
	const mapping = React.useContext(StylingContext);
	if (mapping[selector]) {
		return null;
	}
	mapping[selector] = { default: styles, ...media };
	return null;
};
