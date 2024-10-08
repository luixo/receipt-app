import { remapProps } from "nativewind";

import { H1, H2, H3, H4 } from "~components/header";

let applied = false;
export const applyRemaps = () => {
	if (applied) {
		return;
	}
	const baseRemap = { className: "style" } as const;
	[H1, H2, H3, H4].forEach((Component) => remapProps(Component, baseRemap));
	applied = true;
};
