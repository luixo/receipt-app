import type React from "react";

import { tv } from "@heroui/react";
import { Checkbox as CheckboxRaw } from "heroui-native";
import { useCSSVariable } from "uniwind";

import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { Props } from "./checkbox";

const checkbox = tv({
	slots: {
		checkbox: "border-default bg-transparent",
		indicator: "",
	},
	variants: {
		color: {
			default: {
				indicator: "bg-default",
			},
			primary: {
				indicator: "bg-primary",
			},
			secondary: {
				indicator: "bg-secondary",
			},
			success: {
				indicator: "bg-success",
			},
			warning: {
				indicator: "bg-warning",
			},
			danger: {
				indicator: "bg-danger",
			},
		},
		isSelected: {
			true: {
				checkbox: "border-none",
			},
			false: {
				checkbox: "border-2",
			},
		},
		size: {
			sm: {
				checkbox: "size-5",
			},
			md: {
				checkbox: "size-6",
			},
			lg: {
				checkbox: "size-7",
			},
		},
	},
	defaultVariants: {
		color: "primary",
		size: "md",
		isSelected: false,
	},
});

export const Checkbox: React.FC<Props> = ({
	onValueChange,
	isIndeterminate,
	color = "primary",
	icon,
	size,
	children,
	isDisabled,
	className,
	isSelected = false,
}) => {
	const slots = checkbox({ color, isSelected, size });
	const foregroundColor = useCSSVariable(`--heroui-foreground`) as string;
	const backgroundColor = useCSSVariable(`--heroui-background`) as string;
	return (
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
				className={slots.checkbox()}
			>
				<CheckboxRaw.Indicator
					className={slots.indicator()}
					iconProps={{
						color:
							color === "danger" || color === "primary"
								? backgroundColor
								: foregroundColor,
						size: size === "sm" ? 14 : size === "lg" ? 24 : 18,
					}}
				>
					{icon ??
						(isIndeterminate ? <Text className="leading-0">-</Text> : null)}
				</CheckboxRaw.Indicator>
			</CheckboxRaw>
			{children ? (
				<Text className={isDisabled ? "opacity-50" : undefined}>
					{children}
				</Text>
			) : null}
		</View>
	);
};
