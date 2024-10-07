import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { partSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { MinusIcon, PlusIcon } from "~components/icons";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as itemParticipantsUpdateOptions } from "~mutations/item-participants/update";

type Receipt = TRPCQueryOutput<"receipts.get">;
type ReceiptItem = Receipt["items"][number];
type ReceiptItemParts = ReceiptItem["parts"];

type Props = {
	part: ReceiptItemParts[number];
	item: ReceiptItem;
	receipt: Receipt;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemPartInput: React.FC<Props> = ({
	part,
	item,
	receipt,
	isLoading,
	readOnly,
}) => {
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
			context: receipt.id,
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

	if (readOnly) {
		return readOnlyComponent;
	}

	if (isEditing) {
		return wrap(
			<Input
				{...bindings}
				className="w-32"
				aria-label="Item part"
				mutation={updateMutation}
				fieldError={inputState.error}
				isDisabled={isLoading}
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
			isDisabled={isLoading}
			isIconOnly
			className="min-w-unit-16 w-auto px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
