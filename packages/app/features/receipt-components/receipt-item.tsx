import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Card, CardBody, CardHeader } from "~components/card";
import { Chip } from "~components/chip";
import { Divider } from "~components/divider";
import { Icon } from "~components/icons";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import {
	ReceiptItemConsumer,
	ReceiptItemConsumerSkeleton,
} from "./receipt-item-consumer";
import { ReceiptItemConsumers } from "./receipt-item-consumers";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPayers } from "./receipt-item-payers";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";
import type { Item } from "./state";
import { SORT_USERS } from "./utils";

type Props = {
	item: Item;
	ref: React.Ref<HTMLDivElement>;
};

export const ReceiptItem: React.FC<Props> = ({ item, ref }) => {
	const { t } = useTranslation("receipts");
	const { currencyCode, participants } = useReceiptContext();
	const { addItemConsumer, removeItem } = useActionsHooksContext();
	const canEdit = useCanEdit();
	const locale = useLocale();

	const trpc = useTRPC();
	const removeItemMutationState = useTrpcMutationState<"receiptItems.remove">(
		trpc.receiptItems.remove.mutationKey(),
		(vars) => vars.id === item.id,
	);
	const isRemovalPending = removeItemMutationState?.status === "pending";

	const participantsIds = React.useMemo(
		() => participants.map(({ userId }) => userId),
		[participants],
	);
	const addedParticipantsIds = React.useMemo(
		() => item.consumers.map((consumer) => consumer.userId),
		[item.consumers],
	);
	const notAddedParticipantsIds = React.useMemo(
		() =>
			participantsIds.filter(
				(participantId) => !addedParticipantsIds.includes(participantId),
			),
		[addedParticipantsIds, participantsIds],
	);
	const onAddEveryItemParticipant = React.useCallback(() => {
		notAddedParticipantsIds.forEach((participantId) => {
			addItemConsumer(item.id, participantId, 1);
		});
	}, [addItemConsumer, item.id, notAddedParticipantsIds]);
	const sortedConsumers = item.consumers.sort(SORT_USERS);

	return (
		<Card ref={ref}>
			<CardHeader className="flex flex-col items-start justify-between gap-4">
				<View className="flex w-full flex-row justify-between gap-4">
					<View className="flex flex-row items-center gap-4">
						<ReceiptItemNameInput item={item} isDisabled={isRemovalPending} />
						{notAddedParticipantsIds.length > 1 ? (
							<Chip
								color="secondary"
								className="cursor-pointer"
								onClick={onAddEveryItemParticipant}
							>
								{t("item.participants.everyone")}
							</Chip>
						) : null}
					</View>
					{!canEdit ? null : (
						<RemoveButton
							onRemove={() => removeItem(item.id)}
							mutation={{ isPending: isRemovalPending }}
							subtitle={t("item.removeButton.confirmSubtitle")}
							noConfirm={item.consumers.length === 0}
							isIconOnly
						/>
					)}
				</View>
				{canEdit ? (
					<View className="flex w-full flex-1 flex-col items-center justify-stretch self-end sm:flex-row sm:justify-between sm:gap-4">
						<ReceiptItemPayers item={item} className="sm:max-w-[40%]" />
						<Icon name="arrow-right" className="size-9 rotate-90 sm:rotate-0" />
						<ReceiptItemConsumers item={item} className="sm:max-w-[40%]" />
					</View>
				) : null}
			</CardHeader>
			<Divider />
			<CardBody className="gap-2">
				<View className="flex-row flex-wrap items-center gap-2">
					<ReceiptItemPriceInput
						item={item}
						isDisabled={isRemovalPending}
						className="w-full shrink-0 sm:w-36"
					/>
					<ReceiptItemQuantityInput
						item={item}
						isDisabled={isRemovalPending}
						className="w-full shrink-0 sm:w-36"
					/>
					<Text>
						={" "}
						{formatCurrency(
							locale,
							currencyCode,
							round(item.quantity * item.price),
						)}
					</Text>
				</View>
				{sortedConsumers.length === 0 ? null : (
					<>
						<Divider />
						{sortedConsumers.map((consumer) => {
							const matchedParticipant = participants.find(
								(participant) => participant.userId === consumer.userId,
							);
							if (!matchedParticipant) {
								return (
									<ErrorMessage
										key={consumer.userId}
										message={t("item.participants.orphanedError", {
											userId: consumer.userId,
										})}
									/>
								);
							}
							return (
								<ReceiptItemConsumer
									key={consumer.userId}
									consumer={consumer}
									item={item}
									participant={matchedParticipant}
									isDisabled={isRemovalPending}
								/>
							);
						})}
					</>
				)}
			</CardBody>
		</Card>
	);
};

const consumersSkeletonItems = new Array(2).fill(null).map((_, index) => index);

export const ReceiptItemSkeleton: React.FC = () => (
	<Card>
		<CardHeader className="justify-between gap-4">
			<Skeleton className="h-7 w-24 rounded-md" />
		</CardHeader>
		<Divider />
		<CardBody className="gap-2">
			<View className="flex-row items-center gap-2">
				<Skeleton className="h-7 w-12 rounded-md" />
				<Text>x</Text>
				<Skeleton className="h-7 w-12 rounded-md" />
				<Text>=</Text>
				<Skeleton className="h-7 w-12 rounded-md" />
			</View>
			<Divider />
			{consumersSkeletonItems.map((index) => (
				<ReceiptItemConsumerSkeleton key={index} />
			))}
		</CardBody>
	</Card>
);
