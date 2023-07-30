import React from "react";

import {
	Button,
	Loading,
	Modal,
	Spacer,
	Text,
	styled,
} from "@nextui-org/react";

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
					<Text h3>{confirmText}</Text>
					{subtitle ? <Text color="warning">{subtitle}</Text> : null}
				</Modal.Header>
				<Modal.Body css={{ pt: "$4", pb: "$12" }}>
					<Buttons>
						<Button
							auto
							onClick={onYesClick}
							disabled={isLoading}
							color="error"
						>
							{isLoading ? <Loading color="currentColor" size="sm" /> : yesText}
						</Button>
						<Spacer x={0.5} />
						<Button auto onClick={closeModal} disabled={isLoading}>
							{noText}
						</Button>
					</Buttons>
				</Modal.Body>
			</Modal>
		</>
	);
};
