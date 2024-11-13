import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { EmptyCard } from "~app/components/empty-card";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { AvatarGroup } from "~components/avatar";
import { Button } from "~components/button";
import { UserIcon } from "~components/icons";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipant } from "./receipt-participant";

export const ReceiptParticipants: React.FC = () => {
	const { receiptDisabled, participants, selfUserId, getUsersSuggestOptions } =
		useReceiptContext();
	const isOwner = useIsOwner();
	const [isModalOpen, { switchValue: switchModalOpen, setTrue: openModal }] =
		useBooleanState();
	const isSelfAdded = participants.some(
		(participant) => participant.userId === selfUserId,
	);
	const [localFilterIds, setLocalFilterIds] = React.useState<UsersId[]>([]);
	const { addParticipant } = useActionsHooksContext();

	const onUserClick = React.useCallback(
		(userId: UsersId) => {
			setLocalFilterIds((prevIds) => [...prevIds, userId]);
			addParticipant(userId, "editor", {
				onSettled: () =>
					setLocalFilterIds((prevIds) => prevIds.filter((id) => id !== userId)),
			});
		},
		[addParticipant],
	);
	const suggestOptions = React.useMemo(
		() => getUsersSuggestOptions(),
		[getUsersSuggestOptions],
	);
	return (
		<>
			{participants.length === 0 ? (
				<Button onClick={switchModalOpen}>Add participants</Button>
			) : (
				// Fix `ml-2` with finding out why first avatar gets `-ms-2` class instead of `ms-0`
				<AvatarGroup className="ml-2 cursor-pointer" onClick={openModal}>
					{participants.map((payer) => (
						<LoadableUser
							key={payer.userId}
							id={payer.userId}
							foreign={!isOwner}
							onlyAvatar
						/>
					))}
				</AvatarGroup>
			)}
			<Modal
				aria-label="Participant picker"
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
				scrollBehavior="inside"
				classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
				data-testid="participants-picker"
			>
				<ModalContent>
					<ModalHeader>
						<View className="flex-row gap-2">
							<UserIcon size={24} />
							<Text className="text-xl">Participants</Text>
						</View>
					</ModalHeader>
					<ModalBody>
						<View className="flex flex-col gap-2 max-sm:gap-4">
							{participants.map((participant) => (
								<ReceiptParticipant
									key={participant.userId}
									participant={participant}
								/>
							))}
						</View>
						{isOwner ? (
							<UsersSuggest
								filterIds={[
									...localFilterIds,
									...participants.map((participant) => participant.userId),
								]}
								additionalIds={isSelfAdded ? [] : [selfUserId]}
								onUserClick={onUserClick}
								isDisabled={receiptDisabled}
								options={suggestOptions}
								label="Add participants"
							/>
						) : participants.length === 0 ? (
							<EmptyCard title="No participants yet" />
						) : null}
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
