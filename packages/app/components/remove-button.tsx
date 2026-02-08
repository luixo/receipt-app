import type React from "react";

import { useTranslation } from "react-i18next";

import { ConfirmModal } from "~app/components/confirm-modal";
import { Button } from "~components/button";
import { Icon } from "~components/icons";

export const SkeletonRemoveButton: React.FC<
	React.ComponentProps<typeof Button>
> = ({ children, ...props }) => (
	<Button
		color="danger"
		{...props}
		startContent={<Icon className="size-6" name="trash" />}
		isIconOnly={!children}
	>
		{children}
	</Button>
);

type Props = {
	mutation: { isPending: boolean };
	onRemove: () => void;
	children?: string;
	subtitle?: string;
	noConfirm?: boolean;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "color" | "children">;

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
					startContent={
						mutation.isPending ? null : <Icon className="size-6" name="trash" />
					}
				>
					{children}
				</Button>
			)}
		</ConfirmModal>
	);
};

export const RemoveButtonSkeleton: React.FC<
	React.ComponentProps<typeof Button>
> = ({ children, ...props }) => (
	<Button
		color="danger"
		{...props}
		isDisabled
		startContent={<Icon name="trash" className="size-6" />}
	>
		{children}
	</Button>
);
