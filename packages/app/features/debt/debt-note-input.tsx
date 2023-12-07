import React from "react";

import { Textarea, styled } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { debtNoteSchema } from "app/utils/validation";

const Wrapper = styled("div", {
	position: "relative",
});

const CornerIcon = styled("div", {
	position: "absolute",
	bottom: 0,
	right: 0,
});

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
		<Wrapper>
			<Textarea
				{...bindings}
				aria-label="Debt note"
				fullWidth
				disabled={updateMutation.isLoading || isLoading}
				status={inputState.error ? "warning" : undefined}
				helperColor={inputState.error ? "warning" : "error"}
				helperText={inputState.error?.message || updateMutation.error?.message}
			/>
			<CornerIcon>
				<Button
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
			</CornerIcon>
		</Wrapper>
	);
};
