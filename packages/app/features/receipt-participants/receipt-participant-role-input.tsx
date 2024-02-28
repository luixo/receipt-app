import React from "react";
import { View } from "react-native";

import {
	Button,
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "@nextui-org/react";
import {
	AiOutlineUserAdd as EditorIcon,
	AiOutlineUsergroupAdd as OwnerIcon,
	AiOutlineUserDelete as ViewerIcon,
} from "react-icons/ai";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Text } from "~components";
import type { ReceiptsId, UsersId } from "~web/db/models";
import type { Role } from "~web/handlers/receipts/utils";

export type AssignableRole = Exclude<Role, "owner">;

const ROLES: AssignableRole[] = ["editor", "viewer"];

type Props = {
	receiptId: ReceiptsId;
	selfUserId?: UsersId;
	participant: TRPCQueryOutput<"receipts.get">["participants"][number];
	isLoading: boolean;
	isOwner: boolean;
};

export const ReceiptParticipantRoleInput: React.FC<Props> = ({
	receiptId,
	selfUserId,
	participant,
	isLoading,
	isOwner,
}) => {
	const updateParticipantMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(mutations.receiptParticipants.update.options, {
			context: { selfUserId: selfUserId || "unknown" },
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
					isDisabled={isLoading || !isOwner || participant.role === "owner"}
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
				{ROLES.map((pickRole) => (
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
