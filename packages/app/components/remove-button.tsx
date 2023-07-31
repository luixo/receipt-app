import React from "react";

import { Button, Spacer } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";

import { ConfirmModal } from "app/components/confirm-modal";

type Props = {
	mutation: { isLoading: boolean };
	onRemove: () => void;
	children?: string;
	subtitle?: string;
	noConfirm?: boolean;
} & React.ComponentProps<typeof Button>;

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
		isLoading={mutation.isLoading}
		title="Remove modal"
		subtitle={subtitle}
		confirmText="Are you sure?"
	>
		{({ openModal }) => (
			<Button
				auto
				onClick={noConfirm ? onRemove : openModal}
				color="error"
				{...props}
				disabled={props.disabled || mutation.isLoading}
			>
				<TrashBin size={24} />
				{children ? (
					<>
						<Spacer x={0.5} />
						{children}
					</>
				) : null}
			</Button>
		)}
	</ConfirmModal>
);
