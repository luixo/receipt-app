import React from "react";

import { H2, H3, H4 } from "@expo/html-elements";
import { tv } from "@nextui-org/react";

import { Text } from "./text";

const wrapper = tv({
	base: "font-medium",
	variants: {
		size: {
			sm: "text-lg",
			md: "text-2xl",
			lg: "text-4xl",
		},
	},
});

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
	({ size = "md", children, ...props }) => (
		<Text
			{...props}
			Component={getComponent(size)}
			className={wrapper({ size, className: props.className })}
		>
			{children}
		</Text>
	),
);

export { H1, H2, H3, H4 } from "@expo/html-elements";
