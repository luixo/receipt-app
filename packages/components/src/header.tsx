import React from "react";

import { H2, H3, H4 } from "@expo/html-elements";

import { Text } from "./text";
import { cn } from "./utils";

const SIZE_CLASSNAME = {
	sm: "text-lg",
	md: "text-2xl",
	lg: "text-4xl",
};

type Props = React.PropsWithChildren<{
	size?: "sm" | "md" | "lg";
}> &
	Omit<React.ComponentProps<typeof Text>, "children">;

const getComponent = (size: NonNullable<Props["size"]>) => {
	switch (size) {
		case "lg":
			return H2;
		case "md":
			return H3;
		case "sm":
			return H4;
	}
};

export const Header = React.memo<Props>(
	({ size = "md", children, className, ...props }) => (
		<Text
			{...props}
			Component={getComponent(size)}
			className={cn("font-medium", SIZE_CLASSNAME[size], className)}
		>
			{children}
		</Text>
	),
);

export { H1, H2, H3, H4 } from "@expo/html-elements";
