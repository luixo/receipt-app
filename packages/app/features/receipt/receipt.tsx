import React from "react";

import { Loading, Spacer, styled, Text } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { ShrinkText } from "app/components/shrink-text";
import { ReceiptControlButtons } from "app/features/receipt/receipt-control-buttons";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { round } from "app/utils/math";
import { ReceiptsId } from "next-app/src/db/models";

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
};

export const ReceiptInner: React.FC<InnerProps> = ({
	query,
	deleteLoadingState: [deleteLoading, setDeleteLoading],
}) => {
	const receipt = query.data;

	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();
	const asideButtons = (
		<ReceiptControlButtons receipt={receipt} deleteLoading={deleteLoading} />
	);
	const dataDirection = useMatchMediaValue("row", { lessSm: "column" });

	return (
		<>
			<Header
				backHref="/receipts"
				icon="🧾"
				aside={isEditing ? undefined : asideButtons}
			>
				{isEditing && receipt.role === "owner" ? (
					<ReceiptNameInput
						receipt={receipt}
						isLoading={deleteLoading}
						unsetEditing={unsetEditing}
					/>
				) : (
					<ShrinkText fontSizeMin={16} fontSizeStep={2}>
						{receipt.name}
					</ShrinkText>
				)}
				{receipt.role === "owner" && !isEditing ? (
					<IconButton
						auto
						light
						onClick={switchEditing}
						disabled={deleteLoading || receipt.locked}
						css={{ ml: "$4" }}
					>
						<EditIcon size={24} />
					</IconButton>
				) : null}
			</Header>
			<Spacer y={1} />
			<Body css={{ flexDirection: dataDirection }}>
				<div>
					<ReceiptDateInput receipt={receipt} isLoading={deleteLoading} />
					<Spacer y={0.5} />
					<Sum>
						<Text css={{ display: "inline-flex", fontSize: "$xl" }}>
							{round(receipt.sum)}
						</Text>
						<ReceiptCurrencyInput receipt={receipt} isLoading={deleteLoading} />
					</Sum>
				</div>
				{dataDirection === "column" ? <Spacer y={0.5} /> : null}
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
	const query = trpc.receipts.get.useQuery({ id });
	const receiptNameQuery = trpc.receipts.getName.useQuery({ id });
	if (query.status === "loading") {
		return (
			<>
				<Header>{receiptNameQuery.data || id}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <ReceiptInner {...props} query={query} />;
};
