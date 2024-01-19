import React from "react";

import { Button } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";

import { ConfirmModal } from "app/components/confirm-modal";

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
}) => (
	<ConfirmModal
		action={onRemove}
		isLoading={mutation.isPending}
		title="Remove modal"
		subtitle={subtitle}
		confirmText="Are you sure?"
	>
		{({ openModal }) => (
			<Button
				onClick={noConfirm ? onRemove : openModal}
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
