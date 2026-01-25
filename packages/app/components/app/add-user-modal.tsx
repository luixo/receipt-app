import type React from "react";

import { useTranslation } from "react-i18next";

import { AddUserForm } from "~app/features/add-user/add-user-form";
import type { TRPCMutationOutput } from "~app/trpc";
import { Modal } from "~components/modal";
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
			label={t("components.addUserModal.label")}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			className="mb-24 max-w-xl sm:mb-32"
			testID="add-user"
			header={
				<Text className="text-xl">{t("components.addUserModal.title")}</Text>
			}
			bodyClassName="flex flex-col gap-4 py-6"
		>
			<AddUserForm
				key={initialValue}
				onSuccess={onSuccess}
				initialValue={initialValue}
			/>
		</Modal>
	);
};
