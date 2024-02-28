import React from "react";
import { View } from "react-native";

import { Spinner } from "@nextui-org/react";
import { MdOutlineReceipt as ReceiptIcon } from "react-icons/md";

import { LoadableUser } from "~app/components/app/loadable-user";
import { ReceiptParticipantResolvedButton } from "~app/components/app/receipt-participant-resolved-button";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ReceiptItems } from "~app/features/receipt-items/receipt-items-screen";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Text } from "~components";
import { round } from "~utils";
import type { ReceiptsId } from "~web/db/models";

import { ReceiptCurrencyInput } from "./receipt-currency-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptGuestControlButton } from "./receipt-guest-control-button";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptOwnerControlButton } from "./receipt-owner-control-button";
import { ReceiptRemoveButton } from "./receipt-remove-button";
import { ReceiptTransferModal } from "./receipt-transfer-modal";

type InnerProps = {
	query: TRPCQuerySuccessResult<"receipts.get">;
};

export const ReceiptInner: React.FC<InnerProps> = ({ query }) => {
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	const receipt = query.data;

	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();
	const isOwner = receipt.selfUserId === receipt.ownerUserId;
	const disabled =
		!isOwner || deleteLoading || Boolean(receipt.lockedTimestamp);
	const sum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);

	return (
		<>
			<PageHeader
				backHref="/receipts"
				startContent={<ReceiptIcon size={36} />}
				aside={
					<>
						<ReceiptParticipantResolvedButton
							variant="ghost"
							receiptId={receipt.id}
							userId={receipt.selfUserId}
							selfUserId={receipt.selfUserId}
							resolved={
								receipt.participants.find(
									(participant) => participant.userId === receipt.selfUserId,
								)?.resolved
							}
							isDisabled={deleteLoading}
						/>
						{isOwner ? (
							<ReceiptOwnerControlButton
								receipt={receipt}
								deleteLoading={deleteLoading}
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
						receiptId={receipt.id}
						receiptName={receipt.name}
						isOwner={isOwner}
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
					<ReceiptDateInput
						receiptId={receipt.id}
						issued={receipt.issued}
						isOwner={isOwner}
						receiptLocked={Boolean(receipt.lockedTimestamp)}
						isLoading={deleteLoading}
					/>
					<View className="flex-row items-center gap-1">
						<ReceiptCurrencyInput
							receiptId={receipt.id}
							currencyCode={receipt.currencyCode}
							isOwner={isOwner}
							receiptLocked={Boolean(receipt.lockedTimestamp)}
							isLoading={deleteLoading}
							sum={sum}
						/>
					</View>
				</View>
				<LoadableUser id={receipt.ownerUserId} />
			</View>
			{isOwner ? (
				<View className="max-xs:flex-col flex-row items-end justify-end gap-2">
					<ReceiptTransferModal
						receipt={receipt}
						deleteLoading={deleteLoading}
					/>
					<ReceiptRemoveButton
						className="self-end"
						receiptId={receipt.id}
						receiptLocked={Boolean(receipt.lockedTimestamp)}
						selfUserId={receipt.selfUserId}
						participants={receipt.participants}
						isEmpty={receipt.items.length === 0}
						setLoading={setDeleteLoading}
					/>
				</View>
			) : null}
			<ReceiptItems receipt={query.data} isLoading={deleteLoading} />
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
