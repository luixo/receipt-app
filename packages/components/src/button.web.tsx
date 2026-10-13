import type React from "react";

import {
	ButtonGroup as ButtonGroupRaw,
	Button as ButtonRaw,
	Spinner,
	buttonVariants,
} from "@heroui/react";

import { cn } from "~components/utils";

import type { ButtonGroupProps, ButtonProps } from "./button.base";

export const Button: React.FC<ButtonProps> = ({
	testID,
	variant,
	radius,
	startContent,
	endContent,
	isLoading,
	onPress,
	as,
	children,
	className,
	...props
}) => {
	const content = (
		<>
			{startContent}
			{isLoading ? <Spinner size="sm" /> : null}
			{children}
			{endContent}
		</>
	);
	if (as) {
		const Component = as;
		return (
			<Component
				{...props}
				onClick={onPress}
				data-testid={testID}
				className={cn(
					buttonVariants({ variant, size: props.size }),
					radius && `rounded-${radius}`,
					className,
				)}
			>
				{content}
			</Component>
		);
	}
	return (
		<ButtonRaw
			{...props}
			variant={variant}
			isPending={isLoading}
			onPress={onPress}
			className={cn(radius && `rounded-${radius}`, className)}
			data-testid={testID}
		>
			{content}
		</ButtonRaw>
	);
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
	testID,
	radius,
	isIconOnly,
	className,
	children,
	...props
}) => (
	<ButtonGroupRaw
		{...props}
		className={cn(
			radius && `rounded-${radius}`,
			isIconOnly && "[&>button]:aspect-square",
			className,
		)}
		data-testid={testID}
	>
		{children}
	</ButtonGroupRaw>
);
