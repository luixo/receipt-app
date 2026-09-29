import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { LoadablePeerAvatar } from "#app/components/app/loadable-peer-avatar.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import {
	ActionsHooksContext,
	ReceiptContext,
} from "#app/features/receipt-components/context.ts";
import {
	ReceiptItems,
	ReceiptItemsSkeleton,
} from "#app/features/receipt-components/receipt-items.tsx";
import {
	ReceiptParticipants,
	ReceiptParticipantsPreviewSkeleton,
} from "#app/features/receipt-components/receipt-participants.tsx";
import { useBooleanState } from "#app/hooks/use-boolean-state.ts";
import { getPathHooks } from "#app/utils/navigation.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { BackLink } from "#components/back-link.tsx";
import { Icon } from "#components/icons.tsx";
import { SkeletonAvatar } from "#components/skeleton-avatar.tsx";
import { SkeletonDateInput } from "#components/skeleton-date-input.tsx";
import { Skeleton } from "#components/skeleton.tsx";
import { View } from "#components/view.tsx";

import { useActionHooks, useGetReceiptContext } from "./hooks";
import { ReceiptAmountInput } from "./receipt-amount-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptGuestControlButton } from "./receipt-guest-control-button";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptParticipantActions } from "./receipt-participant-actions";
import { ReceiptRemoveButton } from "./receipt-remove-button";
import { ReceiptSyncButton } from "./receipt-sync-button";

type HeaderProps = Omit<React.ComponentProps<typeof PageHeader>, "backHref">;

const Header: React.FC<HeaderProps> = ({ startContent, ...props }) => (
	<PageHeader
		startContent={
			<>
				<BackLink to="/receipts" />
				<Icon name="receipt" className="size-9" />
				{startContent}
			</>
		}
		{...props}
	/>
);

export const ReceiptScreen = suspendedFallback(
	() => {
		const { useParams } = getPathHooks("/_protected/receipts/$id");
		const { id } = useParams();
		const trpc = useTRPC();
		const { data: receipt } = useSuspenseQuery(
			trpc.receipts.get.queryOptions({ id }),
		);

		const [deleteLoading, setDeleteLoading] = React.useState(false);
		const [isEditing, { setFalse: unsetEditing, setTrue: setEditing }] =
			useBooleanState();
		const isOwner = receipt.selfPeerId === receipt.ownerPeerId;
		const disabled = !isOwner || deleteLoading;
		const actionsHooks = useActionHooks(receipt);
		const getReceiptContext = useGetReceiptContext(
			receipt,
			deleteLoading,
			(participant) =>
				isOwner && receipt.selfPeerId !== participant.peerId ? (
					<ReceiptParticipantActions
						participant={participant}
						receipt={receipt}
						outcomingDebtId={
							receipt.debts.direction === "outcoming"
								? receipt.debts.debts.find(
										({ peerId }) => peerId === participant.peerId,
									)?.id
								: undefined
						}
					/>
				) : null,
		);

		return (
			<>
				<Header
					aside={
						isOwner ? (
							<ReceiptRemoveButton
								className="self-end"
								receipt={receipt}
								setLoading={setDeleteLoading}
							/>
						) : null
					}
					endContent={
						disabled ? null : isEditing ? (
							<ReceiptNameInput
								receipt={receipt}
								isLoading={deleteLoading}
								unsetEditing={unsetEditing}
							/>
						) : (
							<Icon name="pencil" className="size-6" onClick={setEditing} />
						)
					}
				>
					{isEditing ? undefined : receipt.name}
				</Header>

				<ReceiptContext value={getReceiptContext}>
					<ActionsHooksContext value={actionsHooks}>
						<View className="items-start gap-2">
							<View className="flex w-full flex-row items-start justify-between gap-2">
								<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
								<View className="flex flex-row gap-2">
									<LoadablePeerAvatar id={receipt.ownerPeerId} />
									{isOwner ? (
										<ReceiptSyncButton
											key={
												// This is required for stability of the hooks in the component
												receipt.participants.length
											}
											receipt={receipt}
											isLoading={deleteLoading}
										/>
									) : (
										<ReceiptGuestControlButton receipt={receipt} />
									)}
								</View>
							</View>
							<View className="flex flex-col justify-center gap-2 sm:flex-row">
								<ReceiptAmountInput
									receipt={receipt}
									isLoading={deleteLoading}
								/>
								<ReceiptParticipants debts={receipt.debts} />
							</View>
						</View>
						<ReceiptItems />
					</ActionsHooksContext>
				</ReceiptContext>
			</>
		);
	},
	() => {
		const { t } = useTranslation("receipts");
		return (
			<>
				<Header>{t("receipt.loading")}</Header>
				<View className="items-start gap-2">
					<View className="flex w-full flex-row items-start justify-between gap-2">
						<SkeletonDateInput />
						<SkeletonAvatar />
					</View>
					<View className="flex flex-col justify-center gap-2 sm:flex-row">
						<Skeleton className="h-7 w-12 self-center rounded-md" />
						<ReceiptParticipantsPreviewSkeleton />
					</View>
				</View>
				<ReceiptItemsSkeleton amount={3} />
			</>
		);
	},
);
