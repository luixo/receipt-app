import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react";
import { FiMinus as MinusIcon, FiPlus as PlusIcon } from "react-icons/fi";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { partSchema } from "~app/utils/validation";
import { Input, Text } from "~components";
import * as mutations from "~mutations";
import type { ReceiptItemsId, ReceiptsId } from "~web/db/models";

type ReceiptItemPart =
	TRPCQueryOutput<"receipts.get">["items"][number]["parts"][number];

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
			<View className="flex-row items-center gap-2">
				<Button
					variant="ghost"
					color="primary"
					isLoading={updateMutation.isPending}
					onClick={() => updatePart((prev) => prev - 1)}
					isDisabled={itemPart.part <= 1}
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
		[updatePart, itemPart.part, updateMutation.isPending],
	);

	const readOnlyComponent = (
		<Text>
			{itemPart.part} / {itemParts}
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
				endContent={<Text className="self-center">/ {itemParts}</Text>}
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
