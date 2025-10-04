import React from "react";

import { Text } from "./text";
import { cn } from "./utils";

// const baseRemap = { className: "style" } as const;
// const H1 = styled(RawH1, baseRemap);
// const H2 = styled(RawH2, baseRemap);
// const H3 = styled(RawH3, baseRemap);
// const H4 = styled(RawH4, baseRemap);

const SIZE_CLASSNAME = {
	sm: "text-lg",
	md: "text-2xl",
	lg: "text-4xl",
	xl: "text-4xl",
};

type Props = React.PropsWithChildren<{
	size?: "sm" | "md" | "lg" | "xl";
}> &
	Omit<React.ComponentProps<typeof Text>, "children">;

const getComponent = (size: NonNullable<Props["size"]>) => {
	// TODO: Get back components from `@expo/html-elements`
	// when classNames are forwardRef'd
	switch (size) {
		case "xl":
			return "h1";
		case "lg":
			return "h2";
		case "md":
			return "h3";
		case "sm":
			return "h4";
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
