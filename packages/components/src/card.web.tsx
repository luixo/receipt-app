import type React from "react";

import { Card as CardRaw, cardVariants } from "@heroui/react";

import { Divider } from "~components/divider";

export type Props = React.PropsWithChildren<{
	className?: string;
	testID?: string;
	bodyClassName?: string;
	header?: React.ReactNode;
	headerClassName?: string;
	footer?: React.ReactNode;
	footerClassName?: string;
	onPress?: () => void;
}>;

export const Card: React.FC<Props & { as?: React.ElementType }> = ({
	className,
	testID,
	bodyClassName,
	header,
	headerClassName,
	footer,
	footerClassName,
	children,
	as,
	...props
}) => {
	const content = (
		<>
			{header ? (
				<>
					<CardRaw.Header className={headerClassName}>{header}</CardRaw.Header>
					<Divider />
				</>
			) : null}
			<CardRaw.Content className={bodyClassName}>{children}</CardRaw.Content>
			{footer ? (
				<>
					<Divider />
					<CardRaw.Footer className={footerClassName}>{footer}</CardRaw.Footer>
				</>
			) : null}
		</>
	);
	if (as) {
		const Component = as;
		return (
			<Component
				{...props}
				data-testid={testID}
				className={cardVariants().base({ className })}
				onClick={props.onPress}
			>
				{content}
			</Component>
		);
	}
	return (
		<CardRaw data-testid={testID} className={className} onClick={props.onPress}>
			{content}
		</CardRaw>
	);
};
