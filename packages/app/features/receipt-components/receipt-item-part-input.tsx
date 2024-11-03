import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { partSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { MinusIcon, PlusIcon } from "~components/icons";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as itemParticipantsUpdateOptions } from "~mutations/item-participants/update";

import { useReceiptContext } from "./context";
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
	const { receiptId, receiptDisabled } = useReceiptContext();
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

	const updateMutation = trpc.itemParticipants.update.useMutation(
		useTrpcMutationOptions(itemParticipantsUpdateOptions, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);

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
			updateMutation.mutate({
				itemId: item.id,
				userId: part.userId,
				update: { type: "part", part: nextPart },
			});
		},
		[part.part, part.userId, updateMutation, item.id, unsetEditing],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<View className="flex-row items-center gap-2">
				<Button
					variant="ghost"
					color="primary"
					isLoading={updateMutation.isPending}
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
					isLoading={updateMutation.isPending}
					onClick={() => updatePart((prev) => prev + 1)}
					isIconOnly
				>
					<PlusIcon size={24} />
				</Button>
			</View>
		),
		[updatePart, part.part, updateMutation.isPending],
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
				mutation={updateMutation}
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
			className="min-w-unit-16 w-auto px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
