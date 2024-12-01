import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { EmptyCard } from "~app/components/empty-card";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { AvatarGroup } from "~components/avatar";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { PencilIcon, UserIcon } from "~components/icons";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipant } from "./receipt-participant";

const ReceiptParticipantsPreview: React.FC<{ switchModal: () => void }> = ({
	switchModal,
}) => {
	const { participants, ownerUserId } = useReceiptContext();
	const isOwner = useIsOwner();
	if (participants.length === 0) {
		return <Button onPress={switchModal}>Add participants</Button>;
	}
	const payerParticipants = participants.filter(({ payPart }) =>
		Boolean(payPart),
	);
	const surePayerParticipants =
		payerParticipants.length === 0
			? [{ userId: ownerUserId, part: 1 }]
			: payerParticipants;
	const debtParticipants = participants.filter(({ debtSum }) => debtSum !== 0);
	return (
		<View
			className="xs:flex-row flex cursor-pointer flex-col gap-2"
			onClick={switchModal}
		>
			<View className="flex flex-row gap-2">
				<Text className="text-2xl leading-9">payed by</Text>
				<AvatarGroup className="ml-2">
					{surePayerParticipants.map((participant) => (
						<LoadableUser
							key={participant.userId}
							id={participant.userId}
							foreign={!isOwner && payerParticipants.length !== 0}
							onlyAvatar
							dimmed={payerParticipants.length === 0}
						/>
					))}
				</AvatarGroup>
			</View>
			{debtParticipants.length !== 0 ? (
				<View className="flex flex-row gap-2">
					<Text className="text-2xl leading-9">for</Text>
					{/* Fix `ml-2` with finding out why first avatar gets `-ms-2` class instead of `ms-0` */}
					<AvatarGroup className="ml-2">
						{debtParticipants.map((participant) => (
							<LoadableUser
								key={participant.userId}
								id={participant.userId}
								foreign={!isOwner}
								onlyAvatar
							/>
						))}
					</AvatarGroup>
				</View>
			) : null}
			<Button
				variant="bordered"
				color="primary"
				onPress={switchModal}
				isIconOnly
			>
				<PencilIcon size={32} />
			</Button>
		</View>
	);
};

export const ReceiptParticipants: React.FC = () => {
	const { receiptDisabled, participants, selfUserId, getUsersSuggestOptions } =
		useReceiptContext();
	const isOwner = useIsOwner();
	const [isModalOpen, { switchValue: switchModalOpen }] = useBooleanState();
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
			<ReceiptParticipantsPreview switchModal={switchModalOpen} />
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
					<ModalBody className="flex flex-col gap-4 py-6">
						{participants.length === 0 ? null : (
							<>
								<View className="flex flex-col gap-2 max-sm:gap-4">
									{participants.map((participant) => (
										<ReceiptParticipant
											key={participant.userId}
											participant={participant}
										/>
									))}
								</View>
								<Divider />
							</>
						)}
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
