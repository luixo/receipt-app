import React from "react";

import { skipToken, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ConfirmModal } from "~app/components/confirm-modal";
import { DebtIntention } from "~app/features/debts-intentions/debt-intention";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { Debt } from "~app/trpc-types";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

type Props = {
	debt: Debt;
};

export const DebtControlButtons: React.FC<Props> = ({ debt }) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const intention = React.useMemo(
		() =>
			debt.their
				? {
						id: debt.id,
						peerId: debt.peerId,
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
			debt.peerId,
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
			{intention &&
			Temporal.ZonedDateTime.compare(debt.updatedAt, intention.updatedAt) <
				0 ? (
				<ConfirmModal
					onConfirm={acceptSyncIntention}
					title={t("debt.acceptIntention.title")}
					subtitle={<DebtIntention intention={intention} />}
					confirmText={t("debt.acceptIntention.confirmText")}
				>
					{({ openModal }) => (
						<Button
							onPress={openModal}
							variant="ghost"
							color="warning"
							isIconOnly
							testID="sync-button"
						>
							<Icon name="sync" className="size-6" />
						</Button>
					)}
				</ConfirmModal>
			) : null}
		</>
	);
};
