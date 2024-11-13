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

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	part: Item["parts"][number];
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemPartInput: React.FC<Props> = ({
	part,
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
		initialValue: part.part,
		schema: partSchema,
		type: "number",
	});
	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update,
			(vars) => vars.userId === part.userId && vars.itemId === item.id,
		);
	const isPending = updateMutationState?.status === "pending";

	const updatePart = React.useCallback(
		(partUpdater: number | ((prev: number) => number)) => {
			const nextPart =
				typeof partUpdater === "function"
					? partUpdater(part.part)
					: partUpdater;
			if (nextPart === part.part) {
				unsetEditing();
				return;
			}
			updateItemConsumerPart(item.id, part.userId, nextPart, {
				onSuccess: unsetEditing,
			});
		},
		[part.part, part.userId, updateItemConsumerPart, item.id, unsetEditing],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<View className="flex-row items-center gap-2">
				<Button
					variant="ghost"
					color="primary"
					isLoading={isPending}
					onClick={() => updatePart((prev) => prev - 1)}
					isDisabled={part.part <= 1}
					isIconOnly
				>
					<MinusIcon size={24} />
				</Button>
				{children}
				<Button
					variant="ghost"
					color="primary"
					isLoading={isPending}
					onClick={() => updatePart((prev) => prev + 1)}
					isIconOnly
				>
					<PlusIcon size={24} />
				</Button>
			</View>
		),
		[updatePart, part.part, isPending],
	);

	const totalParts = item.parts.reduce(
		(acc, itemPart) => acc + itemPart.part,
		0,
	);

	const readOnlyComponent = (
		<Text>
			{part.part} / {totalParts}
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
				aria-label="Item part"
				mutation={updateMutationState}
				fieldError={inputState.error}
				isDisabled={isDisabled}
				labelPlacement="outside-left"
				saveProps={{
					title: "Save item part",
					onClick: () => updatePart(getNumberValue()),
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
