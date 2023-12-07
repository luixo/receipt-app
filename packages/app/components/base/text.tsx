import React from "react";
import { Text as RawText } from "react-native";

import { tv } from "@nextui-org/react";

const text = tv({
	base: "text-foreground font-sans text-base font-normal leading-6",
});

export const Text = React.memo<React.ComponentProps<typeof RawText>>(
	({ className, ...props }) => (
		<RawText {...props} className={text({ className })} />
	),
);
