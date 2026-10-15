import type React from "react";

import { Modal as ModalRaw } from "@heroui/react";

import { cn } from "~components/utils";
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
	isOpen,
	onOpenChange,
	closeButton = true,
}) => (
	<ModalRaw>
		<ModalRaw.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalRaw.Container scroll="inside">
				<ModalRaw.Dialog
					aria-label={label}
					className={cn("p-4", className)}
					data-testid={testID}
				>
					{header ? (
						<ModalRaw.Header className={headerClassName}>
							{header}
						</ModalRaw.Header>
					) : null}
					<ModalRaw.Body className={cn("flex-col gap-3", bodyClassName)}>
						{children}
					</ModalRaw.Body>
					{closeButton ? <ModalRaw.CloseTrigger /> : null}
				</ModalRaw.Dialog>
			</ModalRaw.Container>
		</ModalRaw.Backdrop>
	</ModalRaw>
);
