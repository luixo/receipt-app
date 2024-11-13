import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { partSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { MinusIcon, PlusIcon } from "~components/icons";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { updateSetStateAction } from "~utils/react";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	consumer: Item["consumers"][number];
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemConsumerInput: React.FC<Props> = ({
	consumer,
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { updateItemConsumerPart } = useActionsHooksContext();
	const { receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getNumberValue,
	} = useSingleInput({
		initialValue: consumer.part,
		schema: partSchema,
		type: "number",
	});
	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update,
			(vars) => vars.userId === consumer.userId && vars.itemId === item.id,
		);
	const isPending = updateMutationState?.status === "pending";

	const updateConsumerPart = React.useCallback(
		(setStateAction: React.SetStateAction<number>) => {
			const nextPart = updateSetStateAction(setStateAction, consumer.part);
			if (nextPart === consumer.part) {
				unsetEditing();
				return;
			}
			updateItemConsumerPart(item.id, consumer.userId, nextPart, {
				onSuccess: unsetEditing,
			});
		},
		[
			consumer.part,
			consumer.userId,
			updateItemConsumerPart,
			item.id,
			unsetEditing,
		],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<View className="flex-row items-center gap-2">
				<Button
					variant="ghost"
					color="primary"
					isLoading={isPending}
					onClick={() => updateConsumerPart((prev) => prev - 1)}
					isDisabled={consumer.part <= 1}
					isIconOnly
				>
					<MinusIcon size={24} />
				</Button>
				{children}
				<Button
					variant="ghost"
					color="primary"
					isLoading={isPending}
					onClick={() => updateConsumerPart((prev) => prev + 1)}
					isIconOnly
				>
					<PlusIcon size={24} />
				</Button>
			</View>
		),
		[updateConsumerPart, consumer.part, isPending],
	);

	const totalParts = item.consumers.reduce(
		(acc, itemConsumer) => acc + itemConsumer.part,
		0,
	);

	const readOnlyComponent = (
		<Text>
			{consumer.part} / {totalParts}
		</Text>
	);

	if (!canEdit) {
		return readOnlyComponent;
	}

	const isDisabled = isExternalDisabled || receiptDisabled;

	if (isEditing) {
		return wrap(
			<Input
				{...bindings}
				className="w-32"
				aria-label="Item consumer part"
				mutation={updateMutationState}
				fieldError={inputState.error}
				isDisabled={isDisabled}
				labelPlacement="outside-left"
				saveProps={{
					title: "Save item consumer part",
					onClick: () => updateConsumerPart(getNumberValue()),
				}}
				endContent={<Text className="self-center">/ {totalParts}</Text>}
				variant="bordered"
			/>,
		);
	}

	return wrap(
		<Button
			variant="light"
			onClick={switchEditing}
			isDisabled={isDisabled}
			isIconOnly
			className="w-auto min-w-16 px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
