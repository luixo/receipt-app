import React from "react";

import { Button, Modal, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

export type AssignableRole = Exclude<Role, "owner">;

const ROLES: AssignableRole[] = ["editor", "viewer"];

type Props = {
	receiptId: ReceiptsId;
	participant: TRPCQueryOutput<"receipt-items.get">["participants"][number];
	isLoading: boolean;
	role: Role;
};

export const ReceiptParticipantRoleInput: React.FC<Props> = ({
	receiptId,
	participant,
	isLoading,
	role,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const [isModalOpen, setModalOpen] = React.useState(false);
	const openModal = React.useCallback(() => setModalOpen(true), [setModalOpen]);
	const closeModal = React.useCallback(
		() => setModalOpen(false),
		[setModalOpen]
	);

	const updateParticipantMutation = trpc.useMutation(
		"receipt-participants.update",
		useTrpcMutationOptions(cache.receiptParticipants.update.mutationOptions, {
			isSelfAccount: participant.localUserId === accountQuery.data?.id,
		})
	);
	const changeRole = React.useCallback(
		(nextRole: AssignableRole) => {
			closeModal();
			if (nextRole === participant.role) {
				return;
			}
			updateParticipantMutation.mutate({
				receiptId,
				userId: participant.userId,
				update: { type: "role", role: nextRole },
			});
		},
		[
			updateParticipantMutation,
			receiptId,
			participant.userId,
			participant.role,
			closeModal,
		]
	);

	return (
		<>
			<IconButton
				auto
				ghost
				onClick={openModal}
				disabled={isLoading || role !== "owner" || participant.role === "owner"}
				isLoading={updateParticipantMutation.isLoading}
				css={{
					// this should be a proper variable like $buttonHeight
					// but this leads to var(--nextui--space--buttonHeight)
					// TODO: figure out a proper variable here
					height: "var(--nextui--buttonHeight)",
					fontSize: "inherit",
				}}
			>
				{participant.role}
			</IconButton>
			<Modal
				closeButton
				aria-label="Role picker"
				open={isModalOpen}
				onClose={closeModal}
			>
				<Modal.Header>
					<Text h3>Please choose role for {participant.name}</Text>
				</Modal.Header>
				<Modal.Body>
					{ROLES.map((pickRole) => (
						<Button key={pickRole} ghost onClick={() => changeRole(pickRole)}>
							{pickRole}
						</Button>
					))}
				</Modal.Body>
			</Modal>
		</>
	);
};
