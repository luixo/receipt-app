import React from "react";

import { Trans, useTranslation } from "react-i18next";

import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { EmptyCard } from "~app/components/empty-card";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { TRPCQueryOutput } from "~app/trpc";
import { AvatarGroup } from "~components/avatar";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Icon } from "~components/icons";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipant } from "./receipt-participant";

const ReceiptParticipantsPreview: React.FC<{ switchModal: () => void }> = ({
	switchModal,
}) => {
	const { t } = useTranslation("receipts");
	const { participants, ownerUserId, payers } = useReceiptContext();
	const isOwner = useIsOwner();
	if (participants.length === 0) {
		return <Button onPress={switchModal}>{t("participants.addButton")}</Button>;
	}
	const payerParticipants = participants.filter(({ userId }) =>
		payers.some((payer) => payer.userId === userId),
	);
	const surePayerParticipants =
		payerParticipants.length === 0
			? [{ userId: ownerUserId, part: 1 }]
			: payerParticipants;
	const debtParticipants = participants.filter(({ debt }) => debt.total !== 0);
	return (
		<View className="flex flex-col gap-2 xs:flex-row" onPress={switchModal}>
			<View className="flex flex-row gap-2">
				<Trans
					t={t}
					i18nKey="participants.payedBy"
					components={{
						// eslint-disable-next-line jsx-a11y/heading-has-content
						text: <Text variant="h4" />,
						by: (
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
						),
					}}
				/>
			</View>
			{debtParticipants.length !== 0 ? (
				<View className="flex flex-row gap-2">
					<Trans
						t={t}
						i18nKey="participants.payedFor"
						components={{
							// eslint-disable-next-line jsx-a11y/heading-has-content
							text: <Text variant="h4" />,
							// Fix `ml-2` with finding out why first avatar gets `-ms-2` class instead of `ms-0`
							for: (
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
							),
						}}
					/>
				</View>
			) : null}
			<Button
				variant="bordered"
				color="primary"
				onPress={switchModal}
				isIconOnly
			>
				<Icon name="pencil" className="size-6" />
			</Button>
		</View>
	);
};

const skeletonParticipants = new Array(3).fill(null).map((_, index) => index);

export const ReceiptParticipantsPreviewSkeleton: React.FC = () => {
	const { t } = useTranslation("receipts");
	return (
		<View className="flex cursor-pointer flex-col gap-2 xs:flex-row">
			<View className="flex flex-row gap-2">
				<Trans
					t={t}
					i18nKey="participants.payedBy"
					components={{
						// eslint-disable-next-line jsx-a11y/heading-has-content
						text: <Text variant="h4" />,
						by: (
							<AvatarGroup className="ml-2">
								<SkeletonUser onlyAvatar dimmed />
							</AvatarGroup>
						),
					}}
				/>
			</View>
			<View className="flex flex-row gap-2">
				<Trans
					t={t}
					i18nKey="participants.payedFor"
					components={{
						// eslint-disable-next-line jsx-a11y/heading-has-content
						text: <Text variant="h4" />,
						// Fix `ml-2` with finding out why first avatar gets `-ms-2` class instead of `ms-0`
						for: (
							<AvatarGroup className="ml-2">
								{skeletonParticipants.map((index) => (
									<SkeletonUser key={index} onlyAvatar />
								))}
							</AvatarGroup>
						),
					}}
				/>
			</View>
			<Button variant="bordered" color="primary" isIconOnly isDisabled>
				<Icon name="pencil" className="size-6" />
			</Button>
		</View>
	);
};

export const ReceiptParticipants: React.FC<{
	debts?: TRPCQueryOutput<"receipts.get">["debts"];
}> = ({ debts }) => {
	const { t } = useTranslation("receipts");
	const { receiptDisabled, participants, selfUserId, getUsersSuggestOptions } =
		useReceiptContext();
	const isOwner = useIsOwner();
	const [isModalOpen, { switchValue: switchModalOpen }] = useBooleanState();
	const isSelfAdded = participants.some(
		(participant) => participant.userId === selfUserId,
	);
	const [localFilterIds, setLocalFilterIds] = React.useState<UserId[]>([]);
	const { addParticipant } = useActionsHooksContext();

	const onUserClick = React.useCallback(
		(userId: UserId) => {
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
				aria-label={t("participants.picker.label")}
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
				scrollBehavior="inside"
				classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
				data-testid="participants-picker"
			>
				<ModalContent>
					<ModalHeader>
						<View className="flex-row gap-2">
							<Icon name="user" className="size-6" />
							<Text className="text-xl">{t("participants.picker.title")}</Text>
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
											outcomingDebtId={
												debts?.direction === "outcoming"
													? debts.debts.find(
															({ userId }) => participant.userId === userId,
														)?.id
													: undefined
											}
										/>
									))}
								</View>
								<Divider />
							</>
						)}
						{isOwner ? (
							<UsersSuggest
								filterIds={participants.map(
									(participant) => participant.userId,
								)}
								selected={localFilterIds}
								multiselect
								additionalIds={isSelfAdded ? [] : [selfUserId]}
								onUserClick={onUserClick}
								isDisabled={receiptDisabled}
								options={suggestOptions}
								label={t("participants.picker.addLabel")}
							/>
						) : participants.length === 0 ? (
							<EmptyCard title={t("participants.empty")} />
						) : null}
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
