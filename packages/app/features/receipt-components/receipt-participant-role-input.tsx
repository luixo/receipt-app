import React from "react";
import { View } from "react-native";

import { keys } from "remeda";

import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "~components/dropdown";
import {
	ChevronDown,
	EditorIcon,
	OwnerIcon,
	ViewerIcon,
} from "~components/icons";
import { Text } from "~components/text";
import type { AssignableRole } from "~web/handlers/receipts/utils";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import type { Participant } from "./state";

const ROLES: Record<AssignableRole, true> = { editor: true, viewer: true };

type Props = {
	participant: Participant;
};

export const ReceiptParticipantRoleInput: React.FC<Props> = ({
	participant,
}) => {
	const { receiptId, receiptDisabled } = useReceiptContext();
	const isOwner = useIsOwner();
	const { updateParticipantRole } = useActionsHooksContext();
	const trpc = useTRPC();
	const removeParticipantMutationState =
		useTrpcMutationState<"receiptParticipants.update">(
			trpc.receiptParticipants.update.mutationKey(),
			(vars) =>
				vars.receiptId === receiptId &&
				vars.userId === participant.userId &&
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				vars.update.type === "role",
		);
	const changeRole = React.useCallback(
		(nextRole: AssignableRole) => {
			if (nextRole === participant.role) {
				return;
			}
			updateParticipantRole(participant.userId, nextRole);
		},
		[participant.role, participant.userId, updateParticipantRole],
	);

	return (
		<Dropdown>
			<DropdownTrigger>
				<Button
					variant="flat"
					size="sm"
					isDisabled={
						receiptDisabled || !isOwner || participant.role === "owner"
					}
					isLoading={removeParticipantMutationState?.status === "pending"}
					startContent={<ChevronDown />}
				>
					{participant.role === "owner" ? (
						<OwnerIcon size={24} />
					) : participant.role === "editor" ? (
						<EditorIcon size={24} />
					) : (
						<ViewerIcon size={24} />
					)}
				</Button>
			</DropdownTrigger>
			<DropdownMenu
				aria-label="Roles"
				variant="shadow"
				selectionMode="single"
				selectedKeys={[participant.role]}
			>
				{keys(ROLES).map((pickRole) => (
					<DropdownItem key={pickRole}>
						<View onClick={() => changeRole(pickRole)}>
							<Text>{pickRole}</Text>
						</View>
					</DropdownItem>
				))}
			</DropdownMenu>
		</Dropdown>
	);
};
