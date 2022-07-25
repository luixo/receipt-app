import React from "react";

import { Loading, Spacer, styled, Text } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { QueryErrorMessage } from "app/components/query-error-message";
import { ReceiptAccountedButton } from "app/components/receipt-accounted-button";
import { ReceiptParticipantResolvedButton } from "app/components/receipt-participant-resolved-button";
import { ShrinkText } from "app/components/shrink-text";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { ReceiptsId } from "next-app/src/db/models";

import { ReceiptCurrencyInput } from "./receipt-currency-input";
import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptNameInput } from "./receipt-name-input";
import { ReceiptOwner } from "./receipt-owner";
import { ReceiptRemoveButton } from "./receipt-remove-button";

const Header = styled(Text, {
	display: "flex",
	justifyContent: "space-between",
});

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const TitleInner = styled(ShrinkText, {
	ml: "$4",
});

const Buttons = styled("div", {
	display: "flex",
	alignItems: "center",
	flexShrink: 0,
});

const Body = styled("div", {
	display: "flex",
	justifyContent: "space-between",
});

const AlignEndView = styled("div", {
	alignSelf: "flex-end",
});

type InnerProps = {
	query: TRPCQuerySuccessResult<"receipts.get">;
	deleteLoadingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
};

export const ReceiptInner: React.FC<InnerProps> = ({
	query,
	deleteLoadingState: [deleteLoading, setDeleteLoading],
}) => {
	const receipt = query.data;

	const [isEditing, setEditing] = React.useState(false);

	const switchEditing = React.useCallback(
		() => setEditing((prev) => !prev),
		[setEditing]
	);

	return (
		<>
			<Header>
				<Title h2>
					🧾
					{isEditing && query.data.role === "owner" ? (
						<ReceiptNameInput receipt={query.data} isLoading={deleteLoading} />
					) : (
						<TitleInner min={16} step={2}>
							{query.data.name}
						</TitleInner>
					)}
					{query.data.role === "viewer" ? null : (
						<IconButton
							auto
							light
							onClick={switchEditing}
							disabled={deleteLoading}
							css={{ ml: "$4" }}
						>
							<EditIcon size={24} />
						</IconButton>
					)}
				</Title>
				<Buttons>
					<ReceiptParticipantResolvedButton
						bordered
						receiptId={receipt.id}
						userId={receipt.selfUserId}
						resolved={receipt.participantResolved}
						disabled={deleteLoading}
					/>
					<Spacer x={0.5} />
					<ReceiptAccountedButton
						bordered
						receiptId={receipt.id}
						resolved={receipt.resolved}
						disabled={deleteLoading}
					/>
				</Buttons>
			</Header>
			<Spacer y={1} />
			<Body>
				<div>
					<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
					<Text css={{ display: "inline-flex", fontSize: "$xl" }}>
						{receipt.sum}
						<ReceiptCurrencyInput receipt={receipt} isLoading={deleteLoading} />
					</Text>
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
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: ReceiptsId;
};

export const Receipt: React.FC<Props> = ({ id, ...props }) => {
	const receiptInput = { id };
	const query = trpc.useQuery(["receipts.get", receiptInput]);
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
