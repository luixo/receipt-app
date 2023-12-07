import React from "react";

import { Loading, Modal, styled } from "@nextui-org/react";
import { Button, Spacer } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";

type Props = {
	action: () => void;
	isLoading?: boolean;
	title: string;
	subtitle?: React.ReactNode;
	confirmText: React.ReactNode;
	yesText?: React.ReactNode;
	noText?: React.ReactNode;
	children: (controls: { openModal: () => void }) => React.ReactNode;
};

const Buttons = styled("div", {
	display: "flex",
	justifyContent: "center",
});

export const ConfirmModal: React.FC<Props> = ({
	action,
	title,
	confirmText,
	subtitle,
	yesText = "Yes",
	noText = "No",
	isLoading,
	children,
}) => {
	const [isModalOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();
	const onYesClick = React.useCallback(() => {
		closeModal();
		action();
	}, [action, closeModal]);
	return (
		<>
			{children({ openModal })}
			<Modal
				closeButton
				aria-label={title}
				open={isModalOpen}
				onClose={closeModal}
			>
				<Modal.Header css={{ flexDirection: "column" }}>
					<Text className="text-2xl font-medium">{confirmText}</Text>
					{subtitle ? (
						<Text className="text-warning my-2">{subtitle}</Text>
					) : null}
				</Modal.Header>
				<Modal.Body css={{ pt: "$4", pb: "$12" }}>
					<Buttons>
						<Button color="danger" onClick={onYesClick} isDisabled={isLoading}>
							{isLoading ? <Loading color="currentColor" size="sm" /> : yesText}
						</Button>
						<Spacer x={2} />
						<Button color="primary" onClick={closeModal} isDisabled={isLoading}>
							{noText}
						</Button>
					</Buttons>
				</Modal.Body>
			</Modal>
		</>
	);
};
