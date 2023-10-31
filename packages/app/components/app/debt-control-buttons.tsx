import React from "react";

import { Spacer } from "@nextui-org/react";
import {
	BsEyeFill as SyncIcon,
	BsEyeSlashFill as UnsyncIcon,
} from "react-icons/bs";

import { ConfirmModal } from "app/components/confirm-modal";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
};

export const DebtControlButtons: React.FC<Props> = ({ debt }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const setLocked = React.useCallback(() => {
		updateMutation.mutate({
			id: debt.id,
			update: { locked: !debt.lockedTimestamp },
		});
	}, [updateMutation, debt.id, debt.lockedTimestamp]);
	const updateLocked = React.useCallback(() => {
		updateMutation.mutate({
			id: debt.id,
			update: { locked: true },
		});
	}, [updateMutation, debt.id]);

	return (
		<>
			{debt.lockedTimestamp &&
			debt.their?.lockedTimestamp &&
			debt.their.lockedTimestamp.valueOf() > debt.lockedTimestamp.valueOf() ? (
				<>
					<IconButton
						isLoading={updateMutation.isLoading}
						disabled={updateMutation.isLoading}
						onClick={updateLocked}
						ghost
						color="warning"
						icon={<SyncIcon size={24} />}
					/>
					<Spacer x={0.5} />
				</>
			) : null}
			<ConfirmModal
				action={setLocked}
				isLoading={updateMutation.isLoading}
				title={debt.lockedTimestamp ? "Unsync debt" : "Sync debt"}
				subtitle={
					debt.lockedTimestamp
						? "Debt will stop syncing with the counterparty"
						: "Debt will start syncing with the counterparty"
				}
				confirmText="Are you sure?"
			>
				{({ openModal }) => (
					<IconButton
						isLoading={updateMutation.isLoading}
						disabled={updateMutation.isLoading}
						onClick={debt.lockedTimestamp ? openModal : setLocked}
						ghost
						color={debt.lockedTimestamp ? "error" : "success"}
						icon={
							debt.lockedTimestamp ? (
								<UnsyncIcon size={24} />
							) : (
								<SyncIcon size={24} />
							)
						}
					/>
				)}
			</ConfirmModal>
		</>
	);
};
