import React from "react";
import { View } from "react-native";

import {
	Button,
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "@nextui-org/react-tailwind";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

import { Text } from "app/components/base/text";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptsId, UsersId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";

export type AssignableRole = Exclude<Role, "owner">;

const ROLES: AssignableRole[] = ["editor", "viewer"];

type Props = {
	receiptId: ReceiptsId;
	selfUserId?: UsersId;
	participant: TRPCQueryOutput<"receiptItems.get">["participants"][number];
	isLoading: boolean;
	role: Role;
};

export const ReceiptParticipantRoleInput: React.FC<Props> = ({
	receiptId,
	selfUserId,
	participant,
	isLoading,
	role,
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
				userId: participant.remoteUserId,
				update: { type: "role", role: nextRole },
			});
		},
		[
			updateParticipantMutation,
			receiptId,
			participant.remoteUserId,
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
						isLoading || role !== "owner" || participant.role === "owner"
					}
					isLoading={updateParticipantMutation.isLoading}
					startContent={<ChevronDown />}
				>
					{participant.role}
				</Button>
			</DropdownTrigger>
			<DropdownMenu aria-label="Roles" variant="shadow">
				{ROLES.filter((pickRole) => pickRole !== participant.role).map(
					(pickRole) => (
						<DropdownItem key={pickRole}>
							<View onClick={() => changeRole(pickRole)}>
								<Text>Set &quot;{pickRole}&quot; role</Text>
							</View>
						</DropdownItem>
					),
				)}
			</DropdownMenu>
		</Dropdown>
	);
};
