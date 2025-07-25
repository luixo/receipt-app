import type React from "react";

import { useTranslation } from "react-i18next";

import { AddUserForm } from "~app/features/add-user/add-user-form";
import type { TRPCMutationOutput } from "~app/trpc";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";

type Props = {
	initialValue: string;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSuccess: (response: TRPCMutationOutput<"users.add">) => void;
};

export const AddUserModal: React.FC<Props> = ({
	initialValue,
	onSuccess,
	isOpen,
	onOpenChange,
}) => {
	const { t } = useTranslation("default");
	return (
		<Modal
			aria-label={t("components.addUserModal.label")}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			scrollBehavior="inside"
			classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
			data-testid="add-user"
		>
			<ModalContent>
				<ModalHeader>
					<Text className="text-xl">{t("components.addUserModal.title")}</Text>
				</ModalHeader>
				<ModalBody className="flex flex-col gap-4 py-6">
					<AddUserForm
						key={initialValue}
						onSuccess={onSuccess}
						initialValue={initialValue}
					/>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
