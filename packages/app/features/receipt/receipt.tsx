import React from "react";

import { Loading, Spacer, styled, Text } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { ReceiptAccountedButton } from "app/components/app/receipt-accounted-button";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { ShrinkText } from "app/components/shrink-text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId, UsersId } from "next-app/src/db/models";

import { ReceiptCurrencyInput } from "./receipt-currency-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptOwner } from "./receipt-owner";
import { ReceiptRemoveButton } from "./receipt-remove-button";

const Body = styled("div", {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "start",
});

const AlignEndView = styled("div", {
	alignSelf: "flex-end",
});

const Sum = styled("div", {
	display: "flex",
});

type InnerProps = {
	query: TRPCQuerySuccessResult<"receipts.get">;
	deleteLoadingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
	setCurrency: React.Dispatch<React.SetStateAction<Currency | undefined>>;
};

export const ReceiptInner: React.FC<InnerProps> = ({
	query,
	deleteLoadingState: [deleteLoading, setDeleteLoading],
	setCurrency,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);
	const receipt = query.data;
	React.useEffect(
		() => setCurrency(receipt.currency),
		[setCurrency, receipt.currency]
	);

	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();
	const asideButtons = React.useMemo(
		() => [
			<ReceiptParticipantResolvedButton
				key="resolved"
				ghost
				receiptId={receipt.id}
				remoteUserId={receipt.selfUserId}
				// Typesystem doesn't know that we use account id as self user id
				localUserId={accountQuery.data?.id! as UsersId}
				resolved={receipt.participantResolved}
				disabled={deleteLoading || accountQuery.status !== "success"}
			/>,
			<ReceiptAccountedButton
				key="accounted"
				ghost
				receiptId={receipt.id}
				resolved={receipt.resolved}
				disabled={deleteLoading}
			/>,
		],
		[
			accountQuery.data?.id,
			accountQuery.status,
			deleteLoading,
			receipt.id,
			receipt.resolved,
			receipt.participantResolved,
			receipt.selfUserId,
		]
	);

	return (
		<>
			<Header icon="🧾" aside={isEditing ? undefined : asideButtons}>
				{isEditing && query.data.role === "owner" ? (
					<ReceiptNameInput
						receipt={query.data}
						isLoading={deleteLoading}
						unsetEditing={unsetEditing}
					/>
				) : (
					<ShrinkText fontSizeMin={16} fontSizeStep={2}>
						{query.data.name}
					</ShrinkText>
				)}
				{query.data.role === "owner" && !isEditing ? (
					<IconButton
						auto
						light
						onClick={switchEditing}
						disabled={deleteLoading}
						css={{ ml: "$4" }}
					>
						<EditIcon size={24} />
					</IconButton>
				) : null}
			</Header>
			<Spacer y={1} />
			<Body>
				<div>
					<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
					<Sum>
						<Text css={{ display: "inline-flex", fontSize: "$xl" }}>
							{receipt.sum}
						</Text>
						<ReceiptCurrencyInput receipt={receipt} isLoading={deleteLoading} />
					</Sum>
				</div>
				<ReceiptOwner receipt={receipt} />
			</Body>
			{receipt.role === "owner" ? (
				<AlignEndView>
					<Spacer y={1} />
					<ReceiptRemoveButton
						receipt={receipt}
						setLoading={setDeleteLoading}
					/>
				</AlignEndView>
			) : null}
			{accountQuery.status === "error" ? (
				<>
					<Spacer y={1} />
					<QueryErrorMessage query={accountQuery} />
				</>
			) : null}
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: ReceiptsId;
};

export const Receipt: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.useQuery(["receipts.get", { id }]);
	const receiptNameQuery = trpc.useQuery(["receipts.get-name", { id }]);
	if (query.status === "loading") {
		return (
			<>
				<Header h2>{receiptNameQuery.data || id}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ReceiptInner {...props} query={query} />;
};
