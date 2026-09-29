import type React from "react";

import { useTranslation } from "react-i18next";

import { AddPeerForm } from "#app/features/add-peer/add-peer-form.tsx";
import type { TRPCMutationOutput } from "#app/trpc.ts";
import { Modal } from "#components/modal.tsx";
import { Text } from "#components/text.tsx";

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
