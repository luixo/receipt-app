import React from "react";
import { Text as RawText } from "react-native";

import type { Span } from "@expo/html-elements";

import { cn } from "./utils";

type RawTextProps = Omit<
	React.ComponentProps<typeof RawText> & React.ComponentProps<typeof Span>,
	"style" | "accessibilityRole"
>;

export const Text = React.memo<
	RawTextProps & { Component?: React.ComponentType<RawTextProps> }
>(({ className, Component = RawText, ...props }) => (
	<Component
		{...props}
		className={cn(
			"text-foreground m-0 font-sans text-base font-normal leading-6",
			className,
		)}
	/>
));
