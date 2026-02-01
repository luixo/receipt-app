import type React from "react";

import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

type Props = {
	overlay?: ViewReactNode;
} & React.ComponentProps<typeof View>;

export const Overlay: React.FC<Props> = ({ children, overlay, ...props }) => (
	<View {...props}>
		{children}
		{overlay ? (
			<View
				className="rounded-medium bg-content4 absolute z-10 items-center justify-center opacity-30"
				style={{ inset: -10 }}
			>
				{overlay}
			</View>
		) : null}
	</View>
);
