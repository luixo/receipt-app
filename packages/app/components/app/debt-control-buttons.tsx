import React from "react";

import { ConfirmModal } from "~app/components/confirm-modal";
import { DebtIntention } from "~app/features/debts-intentions/debt-intention";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { SyncIcon } from "~components/icons";
import { options as debtsAcceptIntentionOptions } from "~mutations/debts/accept-intention";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
};

export const DebtControlButtons: React.FC<Props> = ({ debt }) => {
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

	return (
		<>
			{intention &&
			intention.lockedTimestamp.valueOf() > debt.lockedTimestamp.valueOf() ? (
				<ConfirmModal
					action={acceptSyncIntention}
					title="Update debt to a counterparty's version"
					subtitle={<DebtIntention intention={intention} />}
					confirmText="Are you sure?"
				>
					{({ openModal }) => (
						<Button
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
		</>
	);
};
