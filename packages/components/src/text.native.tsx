import React from "react";
import { Text as RawText } from "react-native";

import { ARIA_LEVEL, ROLE, textVariants } from "~components/text.base";
import { cn } from "~components/utils";

import type { Props } from "./text";

export const TextClassContext = React.createContext<string | undefined>(
	undefined,
);

export const Text = ({
	className,
	variant = "span",
	testID,
	children,
}: Props) => {
	const textClass = React.useContext(TextClassContext);

	return (
		<RawText
			className={textVariants({ variant, className: cn(textClass, className) })}
			role={ROLE[variant]}
			aria-level={ARIA_LEVEL[variant]}
			testID={testID}
		>
			{children}
		</RawText>
	);
};
