import React from "react";

import { useTranslation } from "react-i18next";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Button } from "~components/button";
import { Modal } from "~components/modal";
import { Text } from "~components/text";

type Props = {
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
	title: string;
	subtitle?: React.ReactNode;
	confirmText: string;
	yesText?: string;
	noText?: string;
	children: (controls: { openModal: () => void }) => React.ReactNode;
};

export const ConfirmModal: React.FC<Props> = ({
	onConfirm: action,
	onCancel,
	title,
	confirmText,
	subtitle,
	yesText,
	noText,
	isLoading,
	children,
}) => {
	const { t } = useTranslation("default");
	const defaultYesText = yesText ?? t("components.confirmModal.yes");
	const defaultNoText = noText ?? t("components.confirmModal.no");
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
				label={title}
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
				headerClassName="flex-col items-center"
				header={
					<>
						<Text variant="h3">{confirmText}</Text>
						{subtitle ? (
							typeof subtitle === "string" ? (
								<Text variant="h4" className="text-warning mt-2">
									{subtitle}
								</Text>
							) : (
								subtitle
							)
						) : null}
					</>
				}
				bodyClassName="flex-row justify-center gap-2"
			>
				<Button
					color="danger"
					onPress={onYesClick}
					isDisabled={isLoading}
					isLoading={isLoading}
				>
					{defaultYesText}
				</Button>
				<Button color="primary" onPress={onNoClick} isDisabled={isLoading}>
					{defaultNoText}
				</Button>
			</Modal>
		</>
	);
};
