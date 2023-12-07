import React from "react";
import { View } from "react-native";

import { Button, Textarea } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { debtNoteSchema } from "app/utils/validation";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtNoteInput: React.FC<Props> = ({ debt, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: debt.note,
		schema: debtNoteSchema,
	});

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const saveNote = React.useCallback(
		(nextNote: string) => {
			if (debt.note === nextNote) {
				return;
			}
			updateMutation.mutate(
				{ id: debt.id, update: { note: nextNote } },
				{ onSuccess: () => setValue(nextNote) },
			);
		},
		[updateMutation, debt.id, debt.note, setValue],
	);
	const isNoteSync = debt.note === getValue();

	return (
		<View>
			<Textarea
				{...bindings}
				aria-label="Debt note"
				labelPlacement="outside"
				isDisabled={updateMutation.isLoading || isLoading}
				isInvalid={Boolean(inputState.error || updateMutation.error)}
				errorMessage={
					inputState.error?.message || updateMutation.error?.message
				}
			/>
			<Button
				className="absolute bottom-0 right-3"
				title="Save receipt name"
				variant="light"
				isLoading={updateMutation.isLoading}
				isDisabled={isLoading || Boolean(inputState.error) || isNoteSync}
				onClick={() => saveNote(getValue())}
				color={getValue() === debt.note ? "success" : "warning"}
				isIconOnly
			>
				<CheckMark size={24} />
			</Button>
		</View>
	);
};
