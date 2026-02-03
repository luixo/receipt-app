import type React from "react";

import {
	ButtonGroup as ButtonGroupRaw,
	Button as ButtonRaw,
} from "@heroui/button";

import type { ButtonGroupProps, ButtonProps } from "./button.base";

export const Button: React.FC<ButtonProps> = ({ testID, ...props }) => (
	<ButtonRaw {...props} data-testid={testID} />
);

export const ButtonGroup: React.FC<ButtonGroupProps> = (props) => (
	<ButtonGroupRaw {...props} />
);
