import React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUserAvatar } from "~app/components/app/user-avatar";
import { SkeletonDateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import {
	ActionsHooksContext,
	ReceiptContext,
} from "~app/features/receipt-components/context";
import {
	ReceiptItems,
	ReceiptItemsSkeleton,
} from "~app/features/receipt-components/receipt-items";
import {
	ReceiptParticipants,
	ReceiptParticipantsPreviewSkeleton,
} from "~app/features/receipt-components/receipt-participants";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTRPC } from "~app/utils/trpc";
import { ReceiptIcon } from "~components/icons";
import { BackLink } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import type { ReceiptsId } from "~db/models";

import { useActionHooks, useGetReceiptContext } from "./hooks";
import { ReceiptAmountInput } from "./receipt-amount-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptGuestControlButton } from "./receipt-guest-control-button";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptParticipantActions } from "./receipt-participant-actions";
import { ReceiptRemoveButton } from "./receipt-remove-button";
import { ReceiptSyncButton } from "./receipt-sync-button";

type HeaderProps = Omit<
	Partial<React.ComponentProps<typeof PageHeader>>,
	"backHref" | "startContent"
>;

const Header: React.FC<HeaderProps> = (props) => (
	<PageHeader
		startContent={
			<>
				<BackLink to="/receipts" />
				<ReceiptIcon size={36} />
			</>
		}
		{...props}
	/>
);

export const Receipt = suspendedFallback<{ id: ReceiptsId }>(
	({ id }) => {
		const trpc = useTRPC();
		const { data: receipt } = useSuspenseQuery(
			trpc.receipts.get.queryOptions({ id }),
		);

		const [deleteLoading, setDeleteLoading] = React.useState(false);
		const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
			useBooleanState();
		const isOwner = receipt.selfUserId === receipt.ownerUserId;
		const disabled = !isOwner || deleteLoading;
		const actionsHooks = useActionHooks(receipt);
		const getReceiptContext = useGetReceiptContext(
			receipt,
			deleteLoading,
			(participant) =>
				isOwner && receipt.selfUserId !== participant.userId ? (
					<ReceiptParticipantActions
						participant={participant}
						receipt={receipt}
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
				>
					{isEditing ? (
						<ReceiptNameInput
							receipt={receipt}
							isLoading={deleteLoading}
							unsetEditing={unsetEditing}
						/>
					) : (
						<View
							onClick={disabled ? undefined : switchEditing}
							className={disabled ? undefined : "cursor-pointer"}
						>
							<Text className="text-3xl">{receipt.name}</Text>
						</View>
					)}
				</Header>

				<ReceiptContext value={getReceiptContext}>
					<ActionsHooksContext value={actionsHooks}>
						<View className="items-start gap-2">
							<View className="flex w-full flex-row items-start justify-between gap-2">
								<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
								<View className="flex flex-row gap-2">
									<LoadableUser id={receipt.ownerUserId} onlyAvatar />
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
								<ReceiptParticipants />
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
				<Header>
					<Text className="text-3xl">{t("receipt.loading")}</Text>
				</Header>
				<View className="items-start gap-2">
					<View className="flex w-full flex-row items-start justify-between gap-2">
						<SkeletonDateInput />
						<SkeletonUserAvatar />
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
