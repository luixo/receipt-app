import type React from "react";

import { Checkbox as CheckboxRaw } from "@heroui/react";

export type Props = {
	className?: string;
	isSelected?: boolean;
	onValueChange?: (nextSelected: boolean) => void;
	isIndeterminate?: boolean;
	isDisabled?: boolean;
	color?: React.ComponentProps<typeof CheckboxRaw>["color"];
	icon?: React.ReactNode;
	size?: React.ComponentProps<typeof CheckboxRaw>["size"];
	children?: string;
};

export const Checkbox: React.FC<Props> = ({ children, ...props }) => (
	<CheckboxRaw
		{...props}
		classNames={children ? undefined : { wrapper: "me-0" }}
	>
		{children}
	</CheckboxRaw>
);
