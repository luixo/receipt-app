import React from "react";
import { Pressable, View as RawView } from "react-native";

import { TextClassContext } from "~components/text.native";
import { cn } from "~components/utils";

import type { Props } from "./view";

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

export const View = React.memo<Props>(({ onPress, className, ...props }) => {
	const Component = onPress ? Pressable : RawView;
	const view = (
		<Component
			className={cn("active:opacity-hover active:scale-95", className)}
			onPress={onPress}
			{...props}
		/>
	);
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
		return view;
	}
	return <TextClassContext value={styles.join(" ")}>{view}</TextClassContext>;
});
