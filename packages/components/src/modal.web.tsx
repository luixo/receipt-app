import type React from "react";

import {
	ModalBody,
	ModalContent,
	ModalHeader,
	Modal as ModalRaw,
} from "@heroui/modal";

import type { ViewReactNode } from "~components/view";

export type Props = {
	isOpen: boolean;
	onOpenChange: (nextOpen: boolean) => void;
	label?: string;
	testID?: string;
	header?: ViewReactNode;
	children: ViewReactNode;
	className?: string;
	bodyClassName?: string;
	headerClassName?: string;
	closeButton?: boolean;
};

export const Modal: React.FC<Props> = ({
	label,
	testID,
	header,
	children,
	className,
	bodyClassName,
	headerClassName,
	...props
}) => (
	<ModalRaw
		aria-label={label}
		scrollBehavior="inside"
		classNames={{ base: className }}
		data-testid={testID}
		{...props}
	>
		<ModalContent>
			{header ? (
				<ModalHeader className={headerClassName}>{header}</ModalHeader>
			) : null}
			<ModalBody className={bodyClassName}>{children}</ModalBody>
		</ModalContent>
	</ModalRaw>
);
