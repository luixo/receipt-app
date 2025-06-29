import React from "react";

import { skipToken, useMutation } from "@tanstack/react-query";

import { ConfirmModal } from "~app/components/confirm-modal";
import { DebtIntention } from "~app/features/debts-intentions/debt-intention";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { SyncIcon } from "~components/icons";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
};

export const DebtControlButtons: React.FC<Props> = ({ debt }) => {
	const trpc = useTRPC();
	const intention = React.useMemo(
		() =>
			debt.their
				? {
						id: debt.id,
						userId: debt.userId,
						amount: debt.their.amount,
						currencyCode: debt.their.currencyCode,
						updatedAt: debt.their.updatedAt,
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
	const acceptMutation = useMutation(
		trpc.debtIntentions.accept.mutationOptions(
			useTrpcMutationOptions(acceptDebtIntentionOptions, {
				context: intention ? { intention } : skipToken,
			}),
		),
	);
	const acceptSyncIntention = React.useCallback(() => {
		if (!intention) {
			return;
		}
		acceptMutation.mutate({ id: intention.id });
	}, [acceptMutation, intention]);

	return (
		<>
			{intention && intention.updatedAt.valueOf() > debt.updatedAt.valueOf() ? (
				<ConfirmModal
					onConfirm={acceptSyncIntention}
					title="Update debt to a counterparty's version"
					subtitle={<DebtIntention intention={intention} />}
					confirmText="Are you sure?"
				>
					{({ openModal }) => (
						<Button
							onPress={openModal}
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
