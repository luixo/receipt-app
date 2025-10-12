import React from "react";
import { View } from "react-native";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { LoadableUser } from "~app/components/app/loadable-user";
import { ErrorMessage } from "~app/components/error-message";
import { RemoveButton } from "~app/components/remove-button";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { AvatarGroup } from "~components/avatar";
import { Card, CardBody, CardHeader } from "~components/card";
import { Chip } from "~components/chip";
import { Divider } from "~components/divider";
import { ScrollShadow } from "~components/scroll-shadow";
import { Select, SelectItem } from "~components/select";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { UserId } from "~db/ids";
import { options as receiptItemConsumersAddOptions } from "~mutations/receipt-item-payers/add";
import { options as receiptItemConsumersRemoveOptions } from "~mutations/receipt-item-payers/remove";
import { compare } from "~utils/date";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
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
	const delta = compare.zonedDateTime(a.createdAt, b.createdAt);
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
	const { t } = useTranslation("receipts");
	const { currencyCode, participants, receiptId } = useReceiptContext();
	const { addItemConsumer, removeItem } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const canEdit = useCanEdit();
	const locale = useLocale();

	const trpc = useTRPC();
	const removeItemMutationState = useTrpcMutationState<"receiptItems.remove">(
		trpc.receiptItems.remove.mutationKey(),
		(vars) => vars.id === item.id,
	);
	const isRemovalPending = removeItemMutationState?.status === "pending";

	const notAddedParticipants = React.useMemo(() => {
		const addedParticipants = new Set(
			item.consumers.map((consumer) => consumer.userId),
		);
		return participants.filter(
			(participant) => !addedParticipants.has(participant.userId),
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

	const addPayerMutation = useMutation(
		trpc.receiptItemPayers.add.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersAddOptions, {
				context: { receiptId },
			}),
		),
	);
	const addPayer = React.useCallback(
		(userId: UserId) =>
			addPayerMutation.mutate({ itemId: item.id, userId, part: 1 }),
		[addPayerMutation, item.id],
	);
	const removePayerMutation = useMutation(
		trpc.receiptItemPayers.remove.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersRemoveOptions, {
				context: { receiptId },
			}),
		),
	);
	const removePayer = React.useCallback(
		(userId: UserId) => removePayerMutation.mutate({ itemId: item.id, userId }),
		[item.id, removePayerMutation],
	);

	return (
		<Card ref={ref}>
			<CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
				<ReceiptItemNameInput item={item} isDisabled={isRemovalPending} />
				<View className="flex w-full flex-1 flex-row justify-end gap-4 self-end">
					{item.payers.length !== 0 ? (
						<AvatarGroup
							className={cn("ml-2", canEdit ? "cursor-pointer" : undefined)}
						>
							{item.payers.map((payer) => (
								<LoadableUser
									key={payer.userId}
									id={payer.userId}
									foreign={!isOwner}
									onClick={
										canEdit ? () => removePayer(payer.userId) : undefined
									}
								/>
							))}
						</AvatarGroup>
					) : canEdit ? (
						<Select
							className="max-w-64"
							aria-label={t("item.payer.label")}
							placeholder={t("item.payer.placeholder")}
							isDisabled={addPayerMutation.isPending}
							onSelectionChange={(selection) => {
								if (selection instanceof Set) {
									addPayer([...selection.values()][0] as UserId);
								}
							}}
						>
							{participants.map((participant) => (
								<SelectItem
									key={participant.userId}
									textValue={participant.userId}
								>
									<LoadableUser id={participant.userId} foreign={!isOwner} />
								</SelectItem>
							))}
						</Select>
					) : null}
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
								{t("item.participants.everyone")}
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
