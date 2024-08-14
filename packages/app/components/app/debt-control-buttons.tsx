import React from "react";

import { ConfirmModal } from "~app/components/confirm-modal";
import { DebtIntention } from "~app/features/debts-intentions/debt-intention";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components";
import { EyeIcon, EyeSlashIcon, SyncIcon } from "~components/icons";
import { options as debtsAcceptIntentionOptions } from "~mutations/debts/accept-intention";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
};

export const DebtControlButtons: React.FC<Props> = ({ debt }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: debt }),
	);
	const setLocked = React.useCallback(() => {
		updateMutation.mutate({
			id: debt.id,
			update: { locked: !debt.lockedTimestamp },
		});
	}, [updateMutation, debt.id, debt.lockedTimestamp]);

	const intention = React.useMemo(
		() =>
			debt.their?.lockedTimestamp
				? {
						id: debt.id,
						userId: debt.userId,
						amount: debt.their.amount,
						currencyCode: debt.their.currencyCode,
						lockedTimestamp: debt.their.lockedTimestamp,
						timestamp: debt.their.timestamp,
						note: debt.note,
						receiptId: debt.receiptId,
						current: {
							amount: debt.amount,
							currencyCode: debt.currencyCode,
							timestamp: debt.timestamp,
						},
				  }
				: undefined,
		[
			debt.amount,
			debt.currencyCode,
			debt.id,
			debt.note,
			debt.receiptId,
			debt.their,
			debt.timestamp,
			debt.userId,
		],
	);
	const acceptMutation = trpc.debts.acceptIntention.useMutation(
		useTrpcMutationOptions(debtsAcceptIntentionOptions, {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			context: intention!,
		}),
	);
	const acceptSyncIntention = React.useCallback(() => {
		if (!intention) {
			return;
		}
		acceptMutation.mutate({ id: intention.id });
	}, [acceptMutation, intention]);

	const newLocal = "Update debt to a counterparty's version";
	return (
		<>
			{intention &&
			debt.lockedTimestamp &&
			intention.lockedTimestamp.valueOf() > debt.lockedTimestamp.valueOf() ? (
				<ConfirmModal
					action={acceptSyncIntention}
					isLoading={updateMutation.isPending}
					title={newLocal}
					subtitle={<DebtIntention intention={intention} />}
					confirmText="Are you sure?"
				>
					{({ openModal }) => (
						<Button
							isLoading={updateMutation.isPending}
							isDisabled={updateMutation.isPending}
							onClick={openModal}
							variant="ghost"
							color="warning"
							isIconOnly
						>
							<SyncIcon size={24} />
						</Button>
					)}
				</ConfirmModal>
			) : null}
			<ConfirmModal
				action={setLocked}
				isLoading={updateMutation.isPending}
				title={debt.lockedTimestamp ? "Unsync debt" : "Sync debt"}
				subtitle={
					debt.lockedTimestamp
						? "Debt will stop syncing with the counterparty"
						: "Debt will start syncing with the counterparty"
				}
				confirmText="Are you sure?"
			>
				{({ openModal }) => (
					<Button
						isLoading={updateMutation.isPending}
						isDisabled={updateMutation.isPending}
						onClick={debt.lockedTimestamp ? openModal : setLocked}
						variant="ghost"
						color={debt.lockedTimestamp ? "danger" : "success"}
						isIconOnly
					>
						{debt.lockedTimestamp ? (
							<EyeSlashIcon size={24} />
						) : (
							<EyeIcon size={24} />
						)}
					</Button>
				)}
			</ConfirmModal>
		</>
	);
};
