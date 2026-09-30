import React from "react";

import { Trans, useTranslation } from "react-i18next";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { SkeletonPeer } from "~app/components/app/peer";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Dropdown } from "~components/dropdown";
import { Icon } from "~components/icons";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { View } from "~components/view";

import { useActionsHooksContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import { ReceiptItemConsumerInput } from "./receipt-item-consumer-input";
import type { Item, Participant } from "./state";

type Props = {
	consumer: Item["consumers"][number];
	item: Item;
	participant: Participant;
	isDisabled: boolean;
};

export const ReceiptItemConsumer: React.FC<Props> = ({
	consumer,
	item,
	participant,
	isDisabled: isExternalDisabled,
}) => {
	const { t } = useTranslation("receipts");
	const { removeItemConsumer } = useActionsHooksContext();
	const canEdit = useCanEdit();
	const isOwner = useIsOwner();
	const trpc = useTRPC();
	const removeMutationState =
		useTrpcMutationState<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove.mutationKey(),
			(vars) => vars.peerId === consumer.peerId && vars.itemId === item.id,
		);
	const isPending = removeMutationState?.status === "pending";
	const removeConsumer = React.useCallback(
		() => removeItemConsumer(item.id, consumer.peerId),
		[removeItemConsumer, item.id, consumer.peerId],
	);
	const isDisabled = isExternalDisabled || isPending;

	return (
		<View className="items-start justify-between gap-2 sm:gap-4 min-[500px]:flex-row">
			<LoadablePeer id={participant.peerId} foreign={!isOwner} />
			<View className="flex-row gap-2 self-end">
				<ReceiptItemConsumerInput
					consumer={consumer}
					item={item}
					isDisabled={isDisabled}
				/>
				{canEdit ? (
					<Dropdown
						items={[
							{
								key: "remove",
								children: (
									<View
										className="text-danger flex-row items-center gap-1"
										onPress={removeConsumer}
									>
										<Icon name="trash" className="m-1 size-4" />
										<Text>{t("item.consumer.removeButton")}</Text>
									</View>
								),
							},
						]}
					>
						<Button variant="light" isIconOnly>
							<Icon name="ellipsis" className="size-4" />
						</Button>
					</Dropdown>
				) : null}
			</View>
		</View>
	);
};

export const ReceiptItemConsumerSkeleton: React.FC = () => {
	const { t } = useTranslation("receipts");
	return (
		<View className="items-start justify-between gap-2 sm:gap-4 min-[500px]:flex-row">
			<SkeletonPeer />
			<View className="flex-row gap-2 self-end">
				<Trans
					t={t}
					i18nKey="item.consumer.skeletonAmount"
					components={{
						skeleton: <Skeleton className="h-7 w-10 rounded-md" />,
					}}
				/>
			</View>
		</View>
	);
};
