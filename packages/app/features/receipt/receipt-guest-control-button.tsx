import type React from "react";

import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { DebtIcon } from "~components/icons";
import { ButtonLink } from "~components/link";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
};

export const ReceiptGuestControlButton: React.FC<Props> = ({ receipt }) => {
	const { t } = useTranslation("receipts");

	if (receipt.debt.direction === "outcoming") {
		throw new Error("Unexpected owner control button with outcoming debt");
	}
	if (!receipt.debt.id) {
		return null;
	}

	const commonProps = {
		children: <DebtIcon size={24} />,
		title: t("receipt.controlButton.incomingDebt"),
		variant: "bordered",
		color: "primary",
		isIconOnly: true,
	} as const;
	return receipt.debt.hasMine ? (
		<ButtonLink
			to="/debts/$id"
			hash={receipt.debt.id}
			params={{ id: receipt.debt.id }}
			{...commonProps}
		/>
	) : (
		<ButtonLink to="/debts/intentions" {...commonProps} />
	);
};
