import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Card, CardBody, CardHeader } from "~components/card";
import { Chip } from "~components/chip";
import { Divider } from "~components/divider";
import { ScrollShadow } from "~components/scroll-shadow";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import {
	ReceiptItemConsumer,
	ReceiptItemConsumerSkeleton,
} from "./receipt-item-consumer";
import { ReceiptItemConsumerChip } from "./receipt-item-consumer-chip";
import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";
import type { Item } from "./state";

type ItemConsumer = Item["consumers"][number];

const SORT_CONSUMERS = (a: ItemConsumer, b: ItemConsumer) => {
	const delta = a.createdAt.valueOf() - b.createdAt.valueOf();
	if (delta === 0) {
		return a.userId.localeCompare(b.userId);
	}
	return delta;
};

type Props = {
	item: Item;
	ref: React.Ref<HTMLDivElement>;
};

export const ReceiptItem: React.FC<Props> = ({ item, ref }) => {
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

	const notAddedParticipants = React.useMemo(() => {
		const addedParticipants = item.consumers.map((consumer) => consumer.userId);
		return participants.filter(
			(participant) => !addedParticipants.includes(participant.userId),
		);
	}, [item.consumers, participants]);
	const onAddEveryItemParticipant = React.useCallback(() => {
		notAddedParticipants.forEach((participant) => {
			addItemConsumer(item.id, participant.userId, 1);
		});
	}, [addItemConsumer, item.id, notAddedParticipants]);
	const sortedConsumers = React.useMemo(
		() => item.consumers.sort(SORT_CONSUMERS),
		[item.consumers],
	);

	return (
		<Card ref={ref}>
			<CardHeader className="justify-between gap-4">
				<ReceiptItemNameInput item={item} isDisabled={isRemovalPending} />
				{!canEdit ? null : (
					<RemoveButton
						onRemove={() => removeItem(item.id)}
						mutation={{ isPending: isRemovalPending }}
						subtitle="This will remove item with all participant's parts"
						noConfirm={item.consumers.length === 0}
						isIconOnly
					/>
				)}
			</CardHeader>
			<Divider />
			<CardBody className="gap-2">
				<View className="flex-row items-center gap-2">
					<ReceiptItemPriceInput item={item} isDisabled={isRemovalPending} />
					<ReceiptItemQuantityInput item={item} isDisabled={isRemovalPending} />
					<Text>
						={" "}
						{formatCurrency(
							locale,
							currencyCode,
							round(item.quantity * item.price),
						)}
					</Text>
				</View>
				{!canEdit || notAddedParticipants.length === 0 ? null : (
					<ScrollShadow
						orientation="horizontal"
						className="flex w-full flex-row gap-1 overflow-x-auto"
					>
						{notAddedParticipants.length > 1 ? (
							<Chip
								color="secondary"
								className="cursor-pointer"
								onClick={onAddEveryItemParticipant}
							>
								Everyone
							</Chip>
						) : null}
						{notAddedParticipants.map((participant) => (
							<ReceiptItemConsumerChip
								key={participant.userId}
								item={item}
								participant={participant}
							/>
						))}
					</ScrollShadow>
				)}
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
										message={`Consumer part for user id ${consumer.userId} is orphaned. Please report this to support, include receipt id, receipt item name and mentioned user id`}
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
