import type React from "react";

import {
	ButtonGroup as ButtonGroupRaw,
	Button as ButtonRaw,
} from "@heroui/button";

export type ButtonProps = Omit<
	React.ComponentProps<typeof ButtonRaw>,
	"onClick"
> & {
	onClick?: () => void;
};

export const Button: React.FC<ButtonProps> = (props) => (
	<ButtonRaw {...props} />
);

export type ButtonGroupProps = React.ComponentProps<typeof ButtonGroupRaw>;

export const ButtonGroup: React.FC<ButtonGroupProps> = (props) => (
	<ButtonGroupRaw {...props} />
);
