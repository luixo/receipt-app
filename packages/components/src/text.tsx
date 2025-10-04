import React from "react";
import { Text as RawText } from "react-native";

import type { Span } from "@expo/html-elements";

import { cn } from "./utils";

type RawTextProps = Omit<
	React.ComponentProps<typeof RawText> & React.ComponentProps<typeof Span>,
	"style" | "accessibilityRole"
>;

export const Text = React.memo<
	RawTextProps & {
		Component?:
			| React.ComponentType<RawTextProps>
			| keyof React.JSX.IntrinsicElements;
	}
>(({ className, Component = RawText, ...props }) => (
	<Component
		// Temporal solution before getting H1..H4 from @expo/html-elements back
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{...(props as any)}
		className={cn(
			"m-0 font-sans text-base leading-6 font-normal text-foreground",
			className,
		)}
	/>
));
