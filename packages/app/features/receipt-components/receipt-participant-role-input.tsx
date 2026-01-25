import React from "react";

import { useTranslation } from "react-i18next";
import { keys } from "remeda";

import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { Icon } from "~components/icons";
import { Select } from "~components/select";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { AssignableRole, Role } from "~web/handlers/receipts/utils";

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
	const { t } = useTranslation("receipts");
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
	const roleTexts = React.useMemo<Record<Role, string>>(
		() => ({
			viewer: t("participant.role.viewer"),
			editor: t("participant.role.editor"),
			owner: t("participant.role.owner"),
		}),
		[t],
	);

	return (
		<Select
			items={keys(ROLES).map((role) => ({ role }))}
			label={t("participant.role.select.label")}
			placeholder=""
			isDisabled={
				receiptDisabled ||
				!isOwner ||
				participant.role === "owner" ||
				removeParticipantMutationState?.status === "pending"
			}
			className="min-w-[160px]"
			renderValue={() => (
				<View className="flex flex-row gap-2">
					<Icon className="size-6" name={participant.role} />
					<Text>{roleTexts[participant.role]}</Text>
				</View>
			)}
			selectedKeys={[
				participant.role === "owner" ? "viewer" : participant.role,
			]}
			onSelectionChange={(nextKeys) => {
				if (!nextKeys[0]) {
					return;
				}
				changeRole(nextKeys[0]);
			}}
			getKey={({ role }) => role}
		>
			{({ role }) => <Text>{roleTexts[role]}</Text>}
		</Select>
	);
};
