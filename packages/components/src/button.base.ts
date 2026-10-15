import type React from "react";

import type { MaybeText } from "./text.web";
import type { Props as ViewProps, ViewReactNode } from "./view";

export type ButtonProps = Pick<ViewProps, "onPress" | "testID"> & {
	size?: "sm" | "md" | "lg";
	variant?:
		| "primary"
		| "secondary"
		| "tertiary"
		| "outline"
		| "ghost"
		| "danger"
		| "danger-soft";
	radius?: "none" | "sm" | "md" | "lg" | "full";
	fullWidth?: boolean;
	isDisabled?: boolean;
	isIconOnly?: boolean;
	className?: string;
	isLoading?: boolean;
	startContent?: ViewReactNode;
	endContent?: ViewReactNode;
	title?: string;
	"aria-label"?: string;
	as?: React.ElementType;
	type?: "button" | "submit" | "reset";
	form?: string;
	children?: MaybeText | ViewReactNode;
};

export type ButtonGroupProps = Pick<
	ButtonProps,
	| "className"
	| "fullWidth"
	| "size"
	| "variant"
	| "radius"
	| "isDisabled"
	| "isIconOnly"
	| "testID"
> & {
	children?: React.ReactNode;
};
