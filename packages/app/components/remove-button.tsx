import React from "react";

import {
	Button,
	Loading,
	Modal,
	Spacer,
	Text,
	styled,
} from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";
import { UseMutationResult } from "react-query";

import { MutationErrorMessage } from "app/components/mutation-error-message";
import { TRPCError } from "app/trpc";

const RemoveButtons = styled("div", {
	display: "flex",
	justifyContent: "center",
});

type Props = {
	mutation: UseMutationResult<any, TRPCError, any>;
	onRemove: () => void;
	children?: string;
	subtitle?: string;
};

export const RemoveButton: React.FC<Props> = ({
	mutation,
	onRemove,
	children,
	subtitle,
}) => {
	const [isModalOpen, setModalOpen] = React.useState(false);
	const openModal = React.useCallback(() => setModalOpen(true), [setModalOpen]);
	const closeModal = React.useCallback(
		() => setModalOpen(false),
		[setModalOpen]
	);

	return (
		<>
			<Button auto onClick={openModal} color="error">
				<TrashBin size={24} />
				{children ? (
					<>
						<Spacer x={0.5} />
						{children}
					</>
				) : null}
			</Button>
			{mutation.error ? <MutationErrorMessage mutation={mutation} /> : null}
			<Modal
				closeButton
				aria-label="Remove modal"
				open={isModalOpen}
				onClose={closeModal}
			>
				<Modal.Header css={{ flexDirection: "column" }}>
					<Text h3>Are you sure?</Text>
					{subtitle ? <Text color="warning">{subtitle}</Text> : null}
				</Modal.Header>
				<Modal.Body css={{ pt: "$4", pb: "$12" }}>
					<RemoveButtons>
						<Button
							auto
							onClick={onRemove}
							disabled={mutation.isLoading}
							color="error"
						>
							{mutation.isLoading ? (
								<Loading color="currentColor" size="sm" />
							) : (
								"Yes"
							)}
						</Button>
						<Spacer x={0.5} />
						<Button auto onClick={closeModal} disabled={mutation.isLoading}>
							No
						</Button>
					</RemoveButtons>
				</Modal.Body>
			</Modal>
		</>
	);
};
