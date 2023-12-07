import React from "react";

import { tv } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";

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

export const Header = React.memo<Props>(
	({ size = "md", children, ...props }) => (
		<Text {...props} className={wrapper({ size, className: props.className })}>
			{children}
		</Text>
	),
);
