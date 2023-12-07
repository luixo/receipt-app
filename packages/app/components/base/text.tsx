import React from "react";
import { Text as RawText } from "react-native";

import type { TextProps } from "@expo/html-elements/build/primitives/Text";
import { tv } from "@nextui-org/react";

const text = tv({
	base: "text-foreground m-0 font-sans text-base font-normal leading-6",
});

type RawTextProps = Omit<
	React.ComponentProps<typeof RawText> & TextProps,
	"style" | "accessibilityRole"
>;

export const Text = React.memo<
	RawTextProps & { Component?: React.ComponentType<RawTextProps> }
>(({ className, Component = RawText, ...props }) => (
	<Component {...props} className={text({ className })} />
));
