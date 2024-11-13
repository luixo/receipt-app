import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import {
	actionsHooksContext,
	receiptContext,
} from "~app/features/receipt-components/context";
import { ReceiptItems } from "~app/features/receipt-components/receipt-items";
import { ReceiptParticipants } from "~app/features/receipt-components/receipt-participants";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { ReceiptIcon } from "~components/icons";
import { Spinner } from "~components/spinner";
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

type InnerProps = {
	query: TRPCQuerySuccessResult<"receipts.get">;
};

export const ReceiptInner: React.FC<InnerProps> = ({ query }) => {
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	const receipt = query.data;

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
			<PageHeader
				backHref="/receipts"
				startContent={<ReceiptIcon size={36} />}
				aside={
					isOwner ? (
						<ReceiptRemoveButton
							className="self-end"
							receipt={receipt}
							setLoading={setDeleteLoading}
						/>
					) : null
				}
				title={`Receipt ${receipt.name}`}
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
			</PageHeader>

			<receiptContext.Provider value={getReceiptContext}>
				<actionsHooksContext.Provider value={actionsHooks}>
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
							<ReceiptAmountInput receipt={receipt} isLoading={deleteLoading} />
							<View className="xs:flex-row flex flex-col gap-2">
								<View className="flex flex-row gap-2">
									<Text className="text-2xl leading-9">payed by</Text>
									<LoadableUser id={receipt.ownerUserId} onlyAvatar />
								</View>
								<View className="flex flex-row gap-2">
									{receipt.participants.length === 0 ? null : (
										<Text className="text-2xl leading-9">for</Text>
									)}
									<ReceiptParticipants />
								</View>
							</View>
						</View>
					</View>
					<ReceiptItems />
				</actionsHooksContext.Provider>
			</receiptContext.Provider>
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: ReceiptsId;
};

export const Receipt: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.receipts.get.useQuery({ id });
	if (query.status === "pending") {
		return (
			<>
				<PageHeader>{id}</PageHeader>
				<Spinner size="lg" />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ReceiptInner {...props} query={query} />;
};
