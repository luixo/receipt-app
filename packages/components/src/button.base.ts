import type {
	ButtonGroupProps as RawButtonGroupProps,
	ButtonProps as RawButtonProps,
} from "@heroui/react";

import type { MaybeText } from "./text.web";
import type { Props as ViewProps, ViewReactNode } from "./view";

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
	| "isLoading"
	| "startContent"
	| "endContent"
	| "title"
	| "as"
	| "type"
	| "form"
> &
	Pick<ViewProps, "onPress" | "testID"> & {
		children?: MaybeText | ViewReactNode;
	};

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
