import type React from "react";
import type { Role } from "react-native";

import { type VariantProps, cva } from "class-variance-authority";

export const textVariants = cva("m-0 font-sans", {
	variants: {
		variant: {
			span: "text-base font-normal",
			h1: "text-4xl font-extrabold tracking-tight",
			h2: "text-3xl font-semibold tracking-tight",
			h3: "text-2xl font-semibold tracking-tight",
			h4: "text-xl font-semibold tracking-tight",
			p: "text-base font-normal",
			blockquote: "text-base font-normal border-l-2 pl-3 italic",
			code: "relative rounded font-mono text-sm font-semibold",
		},
	},
	defaultVariants: {
		variant: "span",
	},
});

export type TextVariant = NonNullable<
	VariantProps<typeof textVariants>["variant"]
>;

export const ROLE: Partial<Record<TextVariant, React.AriaRole & Role>> = {
	h1: "heading",
	h2: "heading",
	h3: "heading",
	h4: "heading",
};

export const ARIA_LEVEL: Partial<Record<TextVariant, number>> = {
	h1: 1,
	h2: 2,
	h3: 3,
	h4: 4,
};
