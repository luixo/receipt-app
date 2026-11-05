import type React from "react";

import {
	ButtonGroup as ButtonGroupRaw,
	Button as ButtonRaw,
	Spinner,
	buttonVariants,
} from "@heroui/react";

import { cn } from "~components/utils";

import type { ButtonGroupProps, ButtonProps } from "./button.base";

const radiusClasses = {
	none: "rounded-none",
	sm: "rounded-sm",
	md: "rounded-md",
	lg: "rounded-lg",
	full: "rounded-full",
};

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
	if (as !== undefined) {
		const Component = as;
		return (
			<Component
				{...props}
				{...(props.isDisabled ? { href: undefined } : {})}
				role={props.isDisabled && as === "a" ? "link" : undefined}
				aria-disabled={props.isDisabled || undefined}
				tabIndex={props.isDisabled ? -1 : undefined}
				aria-label={
					props["aria-label"] ?? (props.isIconOnly ? props.title : undefined)
				}
				onClick={onPress}
				data-testid={testID}
				className={cn(
					buttonVariants({ variant, size: props.size }),
					radius && radiusClasses[radius],
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
			slot={null}
			aria-label={
				props["aria-label"] ?? (props.isIconOnly ? props.title : undefined)
			}
			variant={variant}
			isPending={isLoading}
			onPress={onPress}
			className={cn(radius && radiusClasses[radius], className)}
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
			radius && radiusClasses[radius],
			isIconOnly && "[&>button]:aspect-square",
			className,
		)}
		data-testid={testID}
	>
		{children}
	</ButtonGroupRaw>
);
