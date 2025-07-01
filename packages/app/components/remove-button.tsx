import type React from "react";

import { useTranslation } from "react-i18next";

import { ConfirmModal } from "~app/components/confirm-modal";
import { Button } from "~components/button";
import { TrashBin } from "~components/icons";

type Props = {
	mutation: { isPending: boolean };
	onRemove: () => void;
	children?: React.ReactNode;
	subtitle?: string;
	noConfirm?: boolean;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "color">;

export const RemoveButton: React.FC<Props> = ({
	mutation,
	onRemove,
	children,
	subtitle,
	noConfirm,
	...props
}) => {
	const { t } = useTranslation("default");
	return (
		<ConfirmModal
			onConfirm={onRemove}
			isLoading={mutation.isPending}
			title={t("components.removeButton.title")}
			subtitle={subtitle}
			confirmText={t("components.removeButton.confirmText")}
		>
			{({ openModal }) => (
				<Button
					onPress={noConfirm ? onRemove : openModal}
					color="danger"
					{...props}
					isDisabled={props.isDisabled || mutation.isPending}
					isLoading={props.isLoading || mutation.isPending}
				>
					{mutation.isPending ? null : (
						<TrashBin className="shrink-0" size={24} />
					)}
					{children}
				</Button>
			)}
		</ConfirmModal>
	);
};

export const RemoveButtonSkeleton: React.FC<
	React.ComponentProps<typeof Button>
> = ({ children, ...props }) => (
	<Button color="danger" {...props} isDisabled>
		<TrashBin className="shrink-0" size={24} />
		{children}
	</Button>
);
