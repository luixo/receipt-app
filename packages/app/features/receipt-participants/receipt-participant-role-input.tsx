import React from "react";

import { Dropdown, Loading, Text } from "@nextui-org/react";

import { cache } from "app/cache";
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

	const updateParticipantMutation = trpc.useMutation(
		"receipt-participants.update",
		useTrpcMutationOptions(cache.receiptParticipants.update.mutationOptions, {
			userId:
				participant.localUserId === accountQuery.data?.id
					? participant.localUserId
					: undefined,
		})
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
		]
	);

	return (
		<Dropdown>
			<Dropdown.Button
				flat
				size="sm"
				disabled={isLoading || role !== "owner" || participant.role === "owner"}
			>
				{updateParticipantMutation.isLoading ? (
					<Loading size="xs" />
				) : (
					participant.role
				)}
			</Dropdown.Button>
			<Dropdown.Menu aria-label="Roles" variant="shadow">
				{ROLES.filter((pickRole) => pickRole !== participant.role).map(
					(pickRole) => (
						<Dropdown.Item key={pickRole}>
							<Text onClick={() => changeRole(pickRole)}>
								Set &quot;{pickRole}&quot; role
							</Text>
						</Dropdown.Item>
					)
				)}
			</Dropdown.Menu>
		</Dropdown>
	);
};
