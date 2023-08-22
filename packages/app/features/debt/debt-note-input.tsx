import React from "react";

import { styled, Textarea } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
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
				{ id: debt.id, update: { type: "note", note: nextNote } },
				{ onSuccess: () => setValue(nextNote) },
			);
		},
		[updateMutation, debt.id, debt.note, setValue],
	);

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
				<IconButton
					title="Save receipt name"
					light
					isLoading={updateMutation.isLoading}
					disabled={isLoading || Boolean(inputState.error)}
					onClick={() => saveNote(getValue())}
					color={getValue() === debt.note ? undefined : "warning"}
					icon={<CheckMark size={24} />}
				/>
			</CornerIcon>
		</Wrapper>
	);
};
