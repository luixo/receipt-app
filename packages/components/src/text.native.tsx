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

const prefixes = [
	/^font-/,
	/^text-/,
	/^leading-/,
	/^tracking-/,
	/^placeholder-/,
	/^decoration-/,
	/^underline-offset-/,
	/^decoration-/,
	/^text-shadow/,
	/^whitespace-/,
	/^break-/,
	/^hyphens-/,
];
const matches = new Set([
	"underline",
	"overline",
	"line-through",
	"no-underline",
	"italic",
	"not-italic",
	"uppercase",
	"lowercase",
	"capitalize",
	"normal-case",
	"truncate",
	"text-ellipsis",
	"text-clip",
	"normal-nums",
	"ordinal",
	"slashed-zero",
	"lining-nums",
	"oldstyle-nums",
	"proportional-nums",
	"tabular-nums",
	"diagonal-fractions",
	"stacked-fractions",
]);

export const TextWrapper: React.FC<
	React.PropsWithChildren<{ className?: string }>
> = ({ children, className }) => {
	const styles = (className || "")
		.trim()
		.split(" ")
		.filter((classNameElement) => {
			// Pass only text-related non-inheritable props to the context
			const reason = classNameElement.trim().split(":").at(-1)?.trim();
			if (!reason) {
				return;
			}
			return (
				matches.has(reason) || prefixes.some((prefix) => prefix.exec(reason))
			);
		});
	if (styles.length === 0) {
		return children;
	}
	const previousContext = React.use(TextClassContext);
	return (
		<TextClassContext value={cn(previousContext, styles.join(" "))}>
			{children}
		</TextClassContext>
	);
};
