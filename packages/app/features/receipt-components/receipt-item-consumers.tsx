import type React from "react";

import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { LoadableUserAvatar } from "~app/components/app/loadable-user-avatar";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { useTRPC } from "~app/utils/trpc";
import { AvatarGroup } from "~components/avatar";
import { Select } from "~components/select";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit, useIsOwner } from "./hooks";
import type { Item } from "./state";
import { SORT_USERS } from "./utils";

type Props = {
	item: Item;
	className?: string;
};

export const ReceiptItemConsumers: React.FC<Props> = ({ item, className }) => {
	const { t } = useTranslation("receipts");
	const { participants } = useReceiptContext();
	const { addItemConsumer, removeItemConsumer } = useActionsHooksContext();
	const isOwner = useIsOwner();
	const canEdit = useCanEdit();
	const trpc = useTRPC();

	const allParticipantsIds = participants.map(({ userId }) => userId);
	const addedParticipantsIds = item.consumers.map(({ userId }) => userId);
	const notAddedParticipantsIds = new Set(
		allParticipantsIds.filter(
			(participantId) => !addedParticipantsIds.includes(participantId),
		),
	);

	const addConsumerMutationStates =
		useTrpcMutationStates<"receiptItemConsumers.add">(
			trpc.receiptItemConsumers.add.mutationKey(),
			({ itemId }) => itemId === item.id,
		);
	const removeConsumerMutationStates =
		useTrpcMutationStates<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove.mutationKey(),
			({ itemId }) => itemId === item.id,
		);

	const userNames = useQueries({
		queries: participants.map(({ userId }) =>
			isOwner
				? trpc.users.get.queryOptions({ id: userId })
				: trpc.users.getForeign.queryOptions({ id: userId }),
		),
		combine: (queries) =>
			queries.reduce<Record<UserId, string>>(
				(acc, { data }) =>
					data
						? {
								...acc,
								["remoteId" in data ? data.remoteId : data.id]: data.name,
							}
						: acc,
				{},
			),
	});

	return (
		<Select
			className={className}
			label={t("item.consumer.label")}
			placeholder={t("item.consumer.placeholder")}
			selectionMode="multiple"
			selectedKeys={addedParticipantsIds}
			disabledKeys={[
				...addConsumerMutationStates
					.filter((state) => state.status === "pending")
					.map((variables) => variables.variables?.userId),
				...removeConsumerMutationStates
					.filter((state) => state.status === "pending")
					.map((variables) => variables.variables?.userId),
			].filter(isNonNullish)}
			renderValue={(selectedParticipants) => {
				const userIds = selectedParticipants
					.map((participant) => participant.userId)
					.filter(isNonNullish);
				return (
					<View className="flex-row items-center gap-2">
						<AvatarGroup
							className={canEdit ? "cursor-pointer" : undefined}
							size="sm"
							max={3}
						>
							{userIds.map((userId) => (
								<LoadableUserAvatar
									key={userId}
									id={userId}
									foreign={!isOwner}
								/>
							))}
						</AvatarGroup>
						<Text className="text-nowrap">
							{t("item.consumer.group", {
								consumers: userIds
									.map((userId) => userNames[userId])
									.filter(isNonNullish),
							})}
						</Text>
					</View>
				);
			}}
			onSelectionChange={(nextSelected) => {
				addedParticipantsIds
					.filter((id) => !nextSelected.includes(id))
					.forEach((id) => removeItemConsumer(item.id, id));
				nextSelected
					.filter((id) => notAddedParticipantsIds.has(id))
					.forEach((id) => addItemConsumer(item.id, id, 1));
			}}
			items={participants.toSorted(SORT_USERS)}
			getKey={({ userId }) => userId}
		>
			{({ userId }) => <LoadableUser id={userId} foreign={!isOwner} />}
		</Select>
	);
};
