import React from "react";
import { View } from "react-native";

import { Spacer } from "@nextui-org/react";
import { Button, Input } from "@nextui-org/react-tailwind";
import { FiMinus as MinusIcon, FiPlus as PlusIcon } from "react-icons/fi";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { partSchema } from "app/utils/validation";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

type ReceiptItemPart =
	TRPCQueryOutput<"receiptItems.get">["items"][number]["parts"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	itemPart: ReceiptItemPart;
	itemParts: number;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemPartInput: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	itemPart,
	itemParts,
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
		initialValue: itemPart.part,
		schema: partSchema,
		type: "number",
	});

	const updateMutation = trpc.itemParticipants.update.useMutation(
		useTrpcMutationOptions(mutations.itemParticipants.update.options, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);

	const updatePart = React.useCallback(
		(partUpdater: number | ((prev: number) => number)) => {
			const nextPart =
				typeof partUpdater === "function"
					? partUpdater(itemPart.part)
					: partUpdater;
			if (nextPart === itemPart.part) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				itemId: receiptItemId,
				userId: itemPart.userId,
				update: { type: "part", part: nextPart },
			});
		},
		[
			updateMutation,
			receiptItemId,
			itemPart.userId,
			itemPart.part,
			unsetEditing,
		],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<View className="flex-row items-center">
				<Button
					variant="ghost"
					color="primary"
					isLoading={updateMutation.isLoading}
					onClick={() => updatePart((prev) => prev - 1)}
					isDisabled={itemPart.part <= 1}
					isIconOnly
				>
					<MinusIcon size={24} />
				</Button>
				<Spacer x={0.5} />
				{children}
				<Spacer x={0.5} />
				<Button
					variant="ghost"
					color="primary"
					isLoading={updateMutation.isLoading}
					onClick={() => updatePart((prev) => prev + 1)}
					isIconOnly
				>
					<PlusIcon size={24} />
				</Button>
			</View>
		),
		[updatePart, itemPart.part, updateMutation.isLoading],
	);

	const readOnlyComponent = (
		<Text>
			{itemPart.part} / {itemParts}
		</Text>
	);

	if (readOnly) {
		return readOnlyComponent;
	}

	const isPartSync = getNumberValue() === itemPart.part;

	if (isEditing) {
		return wrap(
			<>
				<Input
					{...bindings}
					value={bindings.value.toString()}
					className="w-24"
					aria-label="Item part"
					labelPlacement="outside"
					isDisabled={updateMutation.isLoading || isLoading}
					isInvalid={Boolean(inputState.error || updateMutation.error)}
					errorMessage={
						inputState.error?.message || updateMutation.error?.message
					}
					endContent={
						<Button
							title="Save item part"
							variant="light"
							color={isPartSync ? "success" : "warning"}
							isLoading={updateMutation.isLoading}
							isDisabled={Boolean(inputState.error)}
							onClick={() => updatePart(getNumberValue())}
							isIconOnly
						>
							<CheckMark size={24} />
						</Button>
					}
					variant="bordered"
				/>
				<Text className="ml-2">/ {itemParts}</Text>
			</>,
		);
	}

	return wrap(
		<Button
			variant="light"
			onClick={switchEditing}
			isDisabled={isLoading}
			className="p-0"
			endContent={<EditIcon size={12} />}
		>
			{readOnlyComponent}
		</Button>,
	);
};
