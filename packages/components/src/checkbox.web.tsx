import type React from "react";

import { Checkbox as CheckboxRaw } from "@heroui/react";

export type Props = {
	variant?: React.ComponentProps<typeof CheckboxRaw>["variant"];
	className?: string;
	isSelected?: boolean;
	onValueChange?: (nextSelected: boolean) => void;
	isIndeterminate?: boolean;
	isDisabled?: boolean;
	icon?: React.ComponentProps<typeof CheckboxRaw.Indicator>["children"];
	children?: string;
	testID?: string;
};

export const Checkbox: React.FC<Props> = ({
	children,
	icon,
	onValueChange,
	testID = "checkbox",
	isDisabled,
	isIndeterminate,
	variant,
	...props
}) => (
	<CheckboxRaw
		onChange={onValueChange}
		data-testid={testID}
		isDisabled={isDisabled}
		isIndeterminate={isIndeterminate}
		variant={variant}
	>
		<CheckboxRaw.Content>
			<CheckboxRaw.Control {...props}>
				<CheckboxRaw.Indicator>
					{icon
						? (state) => (typeof icon === "function" ? icon(state) : icon)
						: undefined}
				</CheckboxRaw.Indicator>
			</CheckboxRaw.Control>
			{children}
		</CheckboxRaw.Content>
	</CheckboxRaw>
);
