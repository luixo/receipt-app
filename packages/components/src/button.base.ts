import type {
	ButtonGroupProps as RawButtonGroupProps,
	ButtonProps as RawButtonProps,
} from "@heroui/react";

import type { Props as ViewProps } from "./view";

export type ButtonProps = Pick<
	RawButtonProps,
	| "size"
	| "color"
	| "variant"
	| "radius"
	| "fullWidth"
	| "isDisabled"
	| "isIconOnly"
	| "className"
	| "children"
	| "isLoading"
	| "startContent"
	| "endContent"
	| "title"
	| "as"
	| "type"
	| "form"
> &
	Omit<ViewProps, "children">;

export type ButtonGroupProps = Pick<
	RawButtonGroupProps,
	| "color"
	| "className"
	| "children"
	| "fullWidth"
	| "size"
	| "variant"
	| "radius"
	| "isDisabled"
	| "isIconOnly"
>;
