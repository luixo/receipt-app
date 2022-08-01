import React from "react";

import { Loading, Spacer, styled, Text } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { ReceiptAccountedButton } from "app/components/app/receipt-accounted-button";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { QueryErrorMessage } from "app/components/error-message";
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

const Header = styled("div", {
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
	alignItems: "start",
});

const AlignEndView = styled("div", {
	alignSelf: "flex-end",
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

	const [isEditing, { switchValue: switchEditing }] = useBooleanState();

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
					{query.data.role === "owner" ? (
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
				</Title>
				<Buttons>
					<ReceiptParticipantResolvedButton
						ghost
						receiptId={receipt.id}
						remoteUserId={receipt.selfUserId}
						// Typesystem doesn't know that we use account id as self user id
						localUserId={accountQuery.data?.id! as UsersId}
						resolved={receipt.participantResolved}
						disabled={deleteLoading || accountQuery.status !== "success"}
					/>
					<Spacer x={0.5} />
					<ReceiptAccountedButton
						ghost
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
				<Header>
					<Title h2>{receiptNameQuery.data || id}</Title>
				</Header>
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
