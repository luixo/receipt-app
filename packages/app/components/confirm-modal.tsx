import React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";

type Props = {
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
	title: string;
	subtitle?: React.ReactNode;
	confirmText: React.ReactNode;
	yesText?: React.ReactNode;
	noText?: React.ReactNode;
	children: (controls: { openModal: () => void }) => React.ReactNode;
};

export const ConfirmModal: React.FC<Props> = ({
	onConfirm: action,
	onCancel,
	title,
	confirmText,
	subtitle,
	yesText = "Yes",
	noText = "No",
	isLoading,
	children,
}) => {
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();
	const onYesClick = React.useCallback(() => {
		closeModal();
		action();
	}, [action, closeModal]);
	const onNoClick = React.useCallback(() => {
		closeModal();
		onCancel?.();
	}, [closeModal, onCancel]);
	return (
		<>
			{children({ openModal })}
			<Modal
				closeButton
				aria-label={title}
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
			>
				<ModalContent>
					<ModalHeader className="flex-col items-center">
						<Header>{confirmText}</Header>
						{subtitle ? (
							<Header size="sm" className="text-warning mt-2">
								{subtitle}
							</Header>
						) : null}
					</ModalHeader>
					<ModalBody className="flex-row justify-center gap-2">
						<Button
							color="danger"
							onPress={onYesClick}
							isDisabled={isLoading}
							isLoading={isLoading}
						>
							{yesText}
						</Button>
						<Button color="primary" onPress={onNoClick} isDisabled={isLoading}>
							{noText}
						</Button>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
