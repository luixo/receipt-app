import React from "react";
import { View } from "react-native";

import { keys } from "remeda";

import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
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
import { options as receiptParticipantsUpdateOptions } from "~mutations/receipt-participants/update";
import type { AssignableRole } from "~web/handlers/receipts/utils";

import { useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";

const ROLES: Record<AssignableRole, true> = { editor: true, viewer: true };

type Props = {
	participant: Participant;
};

export const ReceiptParticipantRoleInput: React.FC<Props> = ({
	participant,
}) => {
	const { selfUserId, receiptId, receiptDisabled } = useReceiptContext();
	const isOwner = useIsOwner();
	const updateParticipantMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(receiptParticipantsUpdateOptions, {
			context: { selfUserId },
		}),
	);
	const changeRole = React.useCallback(
		(nextRole: AssignableRole) => {
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
		],
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
					isLoading={updateParticipantMutation.isPending}
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
