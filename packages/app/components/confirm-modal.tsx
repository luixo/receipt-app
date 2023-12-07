import React from "react";
import { View } from "react-native";

import {
	Button,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Spacer,
} from "@nextui-org/react-tailwind";

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
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();
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
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
			>
				<ModalContent>
					<ModalHeader className="flex-col items-center">
						<Text className="text-2xl font-medium">{confirmText}</Text>
						{subtitle ? (
							<Text className="text-warning my-2">{subtitle}</Text>
						) : null}
					</ModalHeader>
					<ModalBody>
						<View className="flex-row justify-center">
							<Button
								color="danger"
								onClick={onYesClick}
								isDisabled={isLoading}
								isLoading={isLoading}
							>
								{yesText}
							</Button>
							<Spacer x={2} />
							<Button
								color="primary"
								onClick={closeModal}
								isDisabled={isLoading}
							>
								{noText}
							</Button>
						</View>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
