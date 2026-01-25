import type React from "react";

import {
	CardBody,
	CardFooter,
	CardHeader,
	Card as CardRaw,
} from "@heroui/card";

import { Divider } from "~components/divider";

type Props = React.PropsWithChildren<{
	className?: string;
	testID?: string;
	bodyClassName?: string;
	header?: React.ReactNode;
	headerClassName?: string;
	footer?: React.ReactNode;
	footerClassName?: string;
	onPress?: () => void;
}>;

export const Card: React.FC<Props> = ({
	className,
	testID,
	bodyClassName,
	header,
	headerClassName,
	footer,
	footerClassName,
	onPress,
	children,
}) => (
	<CardRaw data-testid={testID} className={className} onPress={onPress}>
		{header ? (
			<>
				<CardHeader className={headerClassName}>{header}</CardHeader>
				<Divider />
			</>
		) : null}
		<CardBody className={bodyClassName}>{children}</CardBody>
		{footer ? (
			<>
				<Divider />
				<CardFooter className={footerClassName}>{footer}</CardFooter>
			</>
		) : null}
	</CardRaw>
);
