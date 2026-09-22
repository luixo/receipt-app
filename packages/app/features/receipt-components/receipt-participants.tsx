import React from "react";

import { Trans, useTranslation } from "react-i18next";

import { LoadablePeerAvatar } from "~app/components/app/loadable-peer-avatar";
import { PeersSuggest } from "~app/components/app/peers-suggest";
import { EmptyCard } from "~app/components/empty-card";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { ReceiptDebts } from "~app/trpc-types";
import { AvatarGroup } from "~components/avatar";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Icon } from "~components/icons";
import { Modal } from "~components/modal";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipant } from "./receipt-participant";

const ReceiptParticipantsPreview: React.FC<{ switchModal: () => void }> = ({
	switchModal,
}) => {
	const { t } = useTranslation("receipts");
	const { participants, ownerPeerId, payers } = useReceiptContext();
	const isOwner = useIsOwner();
	if (participants.length === 0) {
		return <Button onPress={switchModal}>{t("participants.addButton")}</Button>;
	}
	const payerParticipants = participants.filter(({ peerId }) =>
		payers.some((payer) => payer.peerId === peerId),
	);
	const surePayerParticipants =
		payerParticipants.length === 0
			? [{ peerId: ownerPeerId, part: 1 }]
			: payerParticipants;
	const debtParticipants = participants.filter(({ debt }) => debt.total !== 0);
	return (
		<View className="flex flex-col gap-2 xs:flex-row" onPress={switchModal}>
			<View className="flex flex-row gap-2">
				<Trans
					t={t}
					i18nKey="participants.payedBy"
					components={{
						text: <Text variant="h4" />,
						by: (
							<AvatarGroup>
								{surePayerParticipants.map((participant) => (
									<LoadablePeerAvatar
										key={participant.peerId}
										id={participant.peerId}
										foreign={!isOwner && payerParticipants.length !== 0}
										dimmed={payerParticipants.length === 0}
									/>
								))}
							</AvatarGroup>
						),
					}}
				/>
			</View>
			{debtParticipants.length === 0 ? null : (
				<View className="flex flex-row gap-2">
					<Trans
						t={t}
						i18nKey="participants.payedFor"
						components={{
							text: <Text variant="h4" />,
							for: (
								<AvatarGroup>
									{debtParticipants.map((participant) => (
										<LoadablePeerAvatar
											key={participant.peerId}
											id={participant.peerId}
											foreign={!isOwner}
										/>
									))}
								</AvatarGroup>
							),
						}}
					/>
				</View>
			)}
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

const skeletonParticipants = Array.from({ length: 3 }, (_, index) => index);

export const ReceiptParticipantsPreviewSkeleton: React.FC = () => {
	const { t } = useTranslation("receipts");
	return (
		<View className="flex cursor-pointer flex-col gap-2 xs:flex-row">
			<View className="flex flex-row gap-2">
				<Trans
					t={t}
					i18nKey="participants.payedBy"
					components={{
						text: <Text variant="h4" />,
						by: (
							<AvatarGroup>
								<SkeletonAvatar dimmed />
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
						text: <Text variant="h4" />,
						for: (
							<AvatarGroup>
								{skeletonParticipants.map((index) => (
									<SkeletonAvatar key={index} />
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
	debts?: ReceiptDebts;
}> = ({ debts }) => {
	const { t } = useTranslation("receipts");
	const { receiptDisabled, participants, selfPeerId, getPeersSuggestOptions } =
		useReceiptContext();
	const isOwner = useIsOwner();
	const [isModalOpen, { switchValue: switchModalOpen }] = useBooleanState();
	const isSelfAdded = participants.some(
		(participant) => participant.peerId === selfPeerId,
	);
	const [localFilterIds, setLocalFilterIds] = React.useState<PeerId[]>([]);
	const { addParticipant } = useActionsHooksContext();

	const onPeerClick = React.useCallback(
		(peerId: PeerId) => {
			setLocalFilterIds((prevIds) => [...prevIds, peerId]);
			addParticipant(peerId, "editor", {
				onSettled: () =>
					setLocalFilterIds((prevIds) => prevIds.filter((id) => id !== peerId)),
			});
		},
		[addParticipant],
	);
	const suggestOptions = React.useMemo(
		() => getPeersSuggestOptions(),
		[getPeersSuggestOptions],
	);
	return (
		<>
			<ReceiptParticipantsPreview switchModal={switchModalOpen} />
			<Modal
				label={t("participants.picker.label")}
				isOpen={isModalOpen}
				onOpenChange={switchModalOpen}
				className="mb-24 max-w-xl sm:mb-32"
				testID="participants-picker"
				header={
					<View className="flex-row gap-2">
						<Icon name="user" className="size-6" />
						<Text className="text-xl">{t("participants.picker.title")}</Text>
					</View>
				}
				bodyClassName="flex flex-col gap-4 py-6"
			>
				{participants.length === 0 ? null : (
					<>
						<View className="flex flex-col gap-4 sm:gap-2">
							{participants.map((participant) => (
								<ReceiptParticipant
									key={participant.peerId}
									participant={participant}
									outcomingDebtId={
										debts?.direction === "outcoming"
											? debts.debts.find(
													({ peerId }) => participant.peerId === peerId,
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
					<PeersSuggest
						filterIds={participants.map((participant) => participant.peerId)}
						selected={localFilterIds}
						multiselect
						additionalIds={isSelfAdded ? [] : [selfPeerId]}
						onPeerClick={onPeerClick}
						isDisabled={receiptDisabled}
						options={suggestOptions}
						label={t("participants.picker.addLabel")}
					/>
				) : participants.length === 0 ? (
					<EmptyCard title={t("participants.empty")} />
				) : null}
			</Modal>
		</>
	);
};
