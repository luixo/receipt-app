import React from "react";

import { Input, Spacer, Text } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { FiMinus as MinusIcon, FiPlus as PlusIcon } from "react-icons/fi";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

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
			<div style={{ display: "flex" }}>
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
			</div>
		),
		[updatePart, itemPart.part, updateMutation.isLoading],
	);

	const readOnlyComponent = (
		<Text css={{ px: "$6", display: "flex", alignItems: "center" }}>
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
					aria-label="Item part"
					disabled={updateMutation.isLoading || isLoading}
					status={inputState.error ? "warning" : undefined}
					helperColor={inputState.error ? "warning" : "error"}
					helperText={
						inputState.error?.message || updateMutation.error?.message
					}
					contentRightStyling={false}
					contentRight={
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
					bordered
					width="$20"
				/>
				<Text>/ {itemParts}</Text>
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
