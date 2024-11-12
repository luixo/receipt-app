import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ReceiptComponents } from "~app/features/receipt-components/receipt-components";
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
	const actionsHooksContext = useActionHooks(receipt);
	const receiptContext = useGetReceiptContext(
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
					<>
						<LoadableUser id={receipt.ownerUserId} shrinkable />
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
					</>
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
			<View className="items-start justify-between gap-2 sm:flex-row">
				<View className="gap-2">
					<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
					<ReceiptAmountInput receipt={receipt} isLoading={deleteLoading} />
				</View>
			</View>
			{isOwner ? (
				<ReceiptRemoveButton
					className="self-end"
					receipt={receipt}
					setLoading={setDeleteLoading}
				/>
			) : null}
			<ReceiptComponents
				receipt={receiptContext}
				actionsHooks={actionsHooksContext}
			/>
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
