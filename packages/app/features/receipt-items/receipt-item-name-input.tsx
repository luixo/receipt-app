import React from "react";

import { Input, styled, Text } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { receiptItemNameSchema } from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";

const Wrapper = styled("div", { display: "flex", alignItems: "center" });

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	readOnly,
}) => {
	const [isEditing, { switchValue: switchEditing }] = useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: receiptItem.name,
		schema: receiptItemNameSchema,
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
			context: receiptId,
			onSuccess: switchEditing,
		})
	);
	const updateName = React.useCallback(
		(name: string) => {
			if (name === receiptItem.name) {
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "name", name },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.name]
	);

	if (!isEditing) {
		return (
			<Wrapper>
				<Text h4>{receiptItem.name}</Text>
				{!readOnly ? (
					<IconButton
						auto
						light
						onClick={switchEditing}
						disabled={isLoading}
						css={{ ml: "$4" }}
					>
						<EditIcon size={24} />
					</IconButton>
				) : null}
			</Wrapper>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item name"
			disabled={updateMutation.isLoading || isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={inputState.error?.message || updateMutation.error?.message}
			contentRightStyling={updateMutation.isLoading}
			contentRight={
				<IconButton
					title="Save receipt item name"
					light
					isLoading={updateMutation.isLoading}
					disabled={Boolean(inputState.error)}
					onClick={() => updateName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
