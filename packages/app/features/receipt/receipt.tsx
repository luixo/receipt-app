import React from "react";
import { View } from "react-native";

import { Spinner } from "@nextui-org/react";
import { MdOutlineReceipt as ReceiptIcon } from "react-icons/md";

import { LoadableUser } from "app/components/app/loadable-user";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { PageHeader } from "app/components/page-header";
import { useBooleanState } from "app/hooks/use-boolean-state";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { ReceiptsId } from "next-app/src/db/models";

import { ReceiptCurrencyInput } from "./receipt-currency-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptGuestControlButton } from "./receipt-guest-control-button";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptOwnerControlButton } from "./receipt-owner-control-button";
import { ReceiptRemoveButton } from "./receipt-remove-button";

type InnerProps = {
	query: TRPCQuerySuccessResult<"receipts.get">;
	deleteLoadingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
};

export const ReceiptInner: React.FC<InnerProps> = ({
	query,
	deleteLoadingState: [deleteLoading, setDeleteLoading],
}) => {
	const receipt = query.data;

	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();
	const disabled =
		receipt.role !== "owner" ||
		deleteLoading ||
		Boolean(receipt.lockedTimestamp);

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
							resolved={receipt.participantResolved}
							isDisabled={deleteLoading}
						/>
						{receipt.role === "owner" ? (
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
					<View className="flex-row items-center gap-1">
						<ReceiptCurrencyInput receipt={receipt} isLoading={deleteLoading} />
					</View>
				</View>
				<LoadableUser id={receipt.ownerUserId} />
			</View>
			{receipt.role === "owner" ? (
				<ReceiptRemoveButton
					className="self-end"
					receipt={receipt}
					setLoading={setDeleteLoading}
				/>
			) : null}
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
