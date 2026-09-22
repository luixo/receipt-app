import type React from "react";

import { useTranslation } from "react-i18next";

import { AddPeerForm } from "~app/features/add-peer/add-peer-form";
import type { TRPCMutationOutput } from "~app/trpc";
import { Modal } from "~components/modal";
import { Text } from "~components/text";

type Props = {
	initialValue: string;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSuccess: (response: TRPCMutationOutput<"peers.add">) => void;
};

export const AddPeerModal: React.FC<Props> = ({
	initialValue,
	onSuccess,
	isOpen,
	onOpenChange,
}) => {
	const { t } = useTranslation("default");
	return (
		<Modal
			label={t("components.addPeerModal.label")}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			className="mb-24 max-w-xl sm:mb-32"
			testID="add-peer"
			header={
				<Text className="text-xl">{t("components.addPeerModal.title")}</Text>
			}
			bodyClassName="flex flex-col gap-4 py-6"
		>
			<AddPeerForm
				key={initialValue}
				onSuccess={onSuccess}
				initialValue={initialValue}
			/>
		</Modal>
	);
};
