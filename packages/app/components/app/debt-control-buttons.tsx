import React from "react";

import { Spacer, styled } from "@nextui-org/react";
import {
	MdSend as SendIcon,
	MdCancel as CancelIcon,
	MdCheckCircle as AcceptIcon,
} from "react-icons/md";

import { cache } from "app/cache";
import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { MutationErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import { LockedIcon } from "app/components/locked-icon";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
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
	const connectedUser = trpc.useQuery([
		"users.has-connected-account",
		{ id: debt.userId },
	]);
	const showConnectionStatus =
		connectedUser.status === "success" ? connectedUser.data : false;

	const size = useMatchMediaValue(48, { lessSm: 36 });

	const addMutation = trpc.useMutation(
		"debts-sync-intentions.add",
		useTrpcMutationOptions(cache.debtsSyncIntentions.add.mutationOptions, debt)
	);
	const sendSyncIntention = React.useCallback(
		() => addMutation.mutate({ id: debt.id }),
		[addMutation, debt.id]
	);

	const removeMutation = trpc.useMutation(
		"debts-sync-intentions.remove",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.remove.mutationOptions,
			debt
		)
	);
	const cancelSyncIntention = React.useCallback(
		() => removeMutation.mutate({ id: debt.id }),
		[removeMutation, debt.id]
	);

	const acceptMutation = trpc.useMutation(
		"debts-sync-intentions.accept",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.accept.mutationOptions,
			React.useMemo(
				() => ({
					userId: debt.userId,
					currency: debt.currency,
					currentAmount: debt.amount,
				}),
				[debt]
			)
		)
	);
	const acceptSyncIntention = React.useCallback(
		() => acceptMutation.mutate({ id: debt.id }),
		[acceptMutation, debt.id]
	);

	const rejectMutation = trpc.useMutation(
		"debts-sync-intentions.reject",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.reject.mutationOptions,
			React.useMemo(
				() => ({ userId: debt.userId, currentAmount: debt.amount }),
				[debt]
			)
		)
	);
	const rejectSyncIntention = React.useCallback(
		() => rejectMutation.mutate({ id: debt.id }),
		[rejectMutation, debt.id]
	);

	const lockMutation = trpc.useMutation(
		"debts.update",
		useTrpcMutationOptions(cache.debts.update.mutationOptions, debt)
	);
	const mutateLock = useAsyncCallback(
		async (isMount, shouldPropagate = false) => {
			await lockMutation.mutateAsync({
				id: debt.id,
				update: {
					type: "locked",
					value: !debt.locked,
				},
			});
			if (!isMount() || !shouldPropagate) {
				return;
			}
			sendSyncIntention();
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
				<>
					{isMutationLoading ||
					!debt.locked ||
					debt.status === "nosync" ? null : (
						<>
							<Spacer x={0.5} />
							<DebtSyncStatus
								status={debt.status}
								intentionDirection={debt.intentionDirection}
								size={size}
							/>
						</>
					)}
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
				</>
			) : null}
			{addMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addMutation} />
				</>
			) : null}
			{removeMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={removeMutation} />
				</>
			) : null}
			{acceptMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={acceptMutation} />
				</>
			) : null}
			{rejectMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={rejectMutation} />
				</>
			) : null}
		</Wrapper>
	);
};
