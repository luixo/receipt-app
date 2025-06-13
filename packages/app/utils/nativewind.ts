import { remapProps } from "nativewind";

import { H1, H2, H3, H4 } from "~components/header";

// eslint-disable-next-line import-x/no-unresolved
import "react-native-css-interop/runtime/components";

let applied = false;
export const applyRemaps = () => {
	if (applied) {
		return;
	}
	const baseRemap = { className: "style" } as const;
	[H1, H2, H3, H4].forEach((Component) => remapProps(Component, baseRemap));
	applied = true;
};
