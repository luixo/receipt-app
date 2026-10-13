import type React from "react";

import { Checkbox as CheckboxRaw } from "heroui-native/checkbox";

import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { Props } from "./checkbox";

export const Checkbox: React.FC<Props> = ({
	onValueChange,
	isIndeterminate,
	variant,
	icon,
	children,
	isDisabled,
	className,
	isSelected = false,
}) => (
	<View
		className={cn("flex flex-row items-center gap-2", className)}
		onPress={
			isDisabled
				? undefined
				: () => {
						onValueChange?.(!isSelected);
					}
		}
	>
		<CheckboxRaw
			isSelected={isSelected}
			isDisabled={isDisabled}
			onSelectedChange={onValueChange}
			variant={variant}
		>
			<CheckboxRaw.Indicator>
				{(props) => {
					if (!icon) {
						return isIndeterminate ? (
							<Text className="leading-0">-</Text>
						) : null;
					}
					if (typeof icon === "function") {
						return icon({
							...props,
							isSelected,
							isIndeterminate: Boolean(isIndeterminate),
							isReadOnly: false,
							isRequired: false,
						});
					}
					return icon;
				}}
			</CheckboxRaw.Indicator>
		</CheckboxRaw>
		{children ? (
			<Text className={isDisabled ? "opacity-50" : undefined}>{children}</Text>
		) : null}
	</View>
);
