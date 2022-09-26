import React from "react";

import { Spacer, styled } from "@nextui-org/react";
import {
	MdSend as SendIcon,
	MdCancel as CancelIcon,
	MdCheckCircle as AcceptIcon,
} from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
});

const VisibilityWrapper = styled("div", {
	display: "flex",

	variants: {
		hidden: {
			true: {
				display: "none",
			},
		},
	},
});

const Buttons = styled("div", {
	display: "flex",
	gap: "$6",
});

const getLockedContent = (locked: boolean) => {
	switch (locked) {
		case false:
			return "Unlocked debt, cannot sync";
		case true:
			return "Locked debt, ready to sync";
	}
};

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	hideLocked?: boolean;
};

export const DebtControlButtons: React.FC<Props> = ({ debt, hideLocked }) => {
	const connectedUser = trpc.users.hasConnectedAccount.useQuery({
		id: debt.userId,
	});
	const showConnectionStatus =
		connectedUser.status === "success" ? connectedUser.data : false;

	const addMutation = trpc.debtsSyncIntentions.add.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.add.options, {
			context: debt,
		})
	);
	const sendSyncIntention = React.useCallback(
		() => addMutation.mutate({ id: debt.id }),
		[addMutation, debt.id]
	);

	const removeMutation = trpc.debtsSyncIntentions.remove.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.remove.options, {
			context: debt,
		})
	);
	const cancelSyncIntention = React.useCallback(
		() => removeMutation.mutate({ id: debt.id }),
		[removeMutation, debt.id]
	);

	const acceptMutation = trpc.debtsSyncIntentions.accept.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.accept.options, {
			context: React.useMemo(
				() => ({
					debtId: debt.id,
					userId: debt.userId,
					currency: debt.currency,
					currentAmount: debt.amount,
				}),
				[debt]
			),
		})
	);
	const acceptSyncIntention = React.useCallback(
		() => acceptMutation.mutate({ id: debt.id }),
		[acceptMutation, debt.id]
	);

	const rejectMutation = trpc.debtsSyncIntentions.reject.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.reject.options, {
			context: React.useMemo(
				() => ({
					userId: debt.userId,
					currentAmount: debt.amount,
					receiptId: debt.receiptId,
				}),
				[debt]
			),
		})
	);
	const rejectSyncIntention = React.useCallback(
		() => rejectMutation.mutate({ id: debt.id }),
		[rejectMutation, debt.id]
	);

	const lockMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt })
	);
	const mutateLock = React.useCallback(
		(shouldPropagate = false) => {
			lockMutation.mutate(
				{
					id: debt.id,
					update: {
						type: "locked",
						value: !debt.locked,
					},
				},
				{
					onSuccess: () => {
						if (shouldPropagate) {
							sendSyncIntention();
						}
					},
				}
			);
		},
		[lockMutation, debt.id, debt.locked, sendSyncIntention]
	);

	const isMutationLoading =
		addMutation.isLoading ||
		removeMutation.isLoading ||
		acceptMutation.isLoading ||
		rejectMutation.isLoading;

	const isLoading = isMutationLoading || lockMutation.isLoading;

	return (
		<Wrapper>
			{hideLocked ? null : (
				<>
					<IconButton
						isLoading={lockMutation.isLoading}
						disabled={isMutationLoading}
						onClick={() => mutateLock()}
						ghost
						color={debt.locked ? "success" : "warning"}
						icon={
							<LockedIcon
								locked={debt.locked}
								tooltip={getLockedContent(debt.locked)}
							/>
						}
					/>
					{!debt.locked && !lockMutation.isLoading ? (
						<>
							<Spacer x={0.5} />
							<IconButton
								isLoading={lockMutation.isLoading}
								disabled={isMutationLoading}
								onClick={() => mutateLock(true)}
								ghost
								color={debt.locked ? "success" : "warning"}
								icon={
									<>
										<LockedIcon
											locked={debt.locked}
											tooltip="Lock and send request"
										/>
										<SendIcon size={24} />
									</>
								}
							/>
						</>
					) : null}
				</>
			)}
			{showConnectionStatus && !lockMutation.isLoading ? (
				<VisibilityWrapper hidden={!debt.locked || debt.status === "sync"}>
					<Spacer x={0.5} />
					{debt.status === "nosync" ||
					(debt.status === "unsync" && !debt.intentionDirection) ? (
						<IconButton
							title="Send sync request"
							isLoading={isLoading}
							icon={<SendIcon size={24} />}
							onClick={sendSyncIntention}
						/>
					) : debt.intentionDirection === "self" ? (
						<IconButton
							title="Cancel sync request"
							isLoading={isLoading}
							icon={<CancelIcon size={24} />}
							onClick={cancelSyncIntention}
						/>
					) : (
						<Buttons>
							<IconButton
								title="Approve sync request"
								isLoading={isLoading}
								icon={<AcceptIcon size={24} />}
								onClick={acceptSyncIntention}
							/>
							<IconButton
								title="Reject sync request"
								isLoading={isLoading}
								icon={<CancelIcon size={24} />}
								onClick={rejectSyncIntention}
							/>
						</Buttons>
					)}
				</VisibilityWrapper>
			) : null}
		</Wrapper>
	);
};
