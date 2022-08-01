import React from "react";

import { Input, Spacer, Text } from "@nextui-org/react";
import { FiMinus as MinusIcon, FiPlus as PlusIcon } from "react-icons/fi";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { parseNumberWithDecimals, partSchema } from "app/utils/validation";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

type ReceiptItemPart =
	TRPCQueryOutput<"receipt-items.get">["items"][number]["parts"][number];

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
	const [isEditing, { switchValue: switchEditing }] = useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: itemPart.part,
		schema: partSchema,
	});

	const updateMutation = trpc.useMutation(
		"item-participants.update",
		useTrpcMutationOptions(
			cache.itemParticipants.update.mutationOptions,
			receiptId
		)
	);

	const updatePart = React.useCallback(
		(partUpdater: number | ((prev: number) => number)) => {
			const nextPart =
				typeof partUpdater === "function"
					? partUpdater(itemPart.part)
					: partUpdater;
			switchEditing();
			if (nextPart === itemPart.part) {
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
			switchEditing,
		]
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<div style={{ display: "flex" }}>
				<IconButton
					ghost
					isLoading={updateMutation.isLoading}
					onClick={() => updatePart((prev) => prev - 1)}
					disabled={itemPart.part <= 1}
					icon={<MinusIcon size={24} />}
				/>
				<Spacer x={0.5} />
				{children}
				<Spacer x={0.5} />
				<IconButton
					ghost
					isLoading={updateMutation.isLoading}
					onClick={() => updatePart((prev) => prev + 1)}
					icon={<PlusIcon size={24} />}
				/>
			</div>
		),
		[updatePart, itemPart.part, updateMutation.isLoading]
	);

	const readOnlyComponent = (
		<Text css={{ px: "$6", display: "flex", alignItems: "center" }}>
			{itemPart.part} / {itemParts}
		</Text>
	);

	const onChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const parsedNumber = parseNumberWithDecimals(e.currentTarget.value);
			if (parsedNumber === undefined) {
				return;
			}
			bindings.onChange(parsedNumber);
		},
		[bindings]
	);

	if (readOnly) {
		return readOnlyComponent;
	}

	if (isEditing) {
		return wrap(
			<>
				<Input
					{...bindings}
					aria-label="Item part"
					onChange={onChange}
					disabled={updateMutation.isLoading || isLoading}
					status={inputState.error ? "warning" : undefined}
					helperColor={inputState.error ? "warning" : "error"}
					helperText={
						inputState.error?.message || updateMutation.error?.message
					}
					contentRightStyling={updateMutation.isLoading}
					contentRight={
						<IconButton
							title="Save item part"
							light
							isLoading={updateMutation.isLoading}
							disabled={Boolean(inputState.error)}
							onClick={() => updatePart(getValue())}
							icon={<CheckMark size={24} />}
						/>
					}
					bordered
					width="$20"
				/>
				<Text>/ {itemParts}</Text>
			</>
		);
	}

	return wrap(
		<IconButton
			auto
			light
			onClick={switchEditing}
			disabled={isLoading}
			css={{ p: 0, width: "$20" }}
			icon={<EditIcon size={12} />}
		>
			{readOnlyComponent}
		</IconButton>
	);
};
