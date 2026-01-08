import type React from "react";

import { useTranslation } from "react-i18next";

import type { TRPCQueryOutput } from "~app/trpc";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
};

export const ReceiptGuestControlButton: React.FC<Props> = ({ receipt }) => {
	const { t } = useTranslation("receipts");

	if (receipt.debts.direction === "outcoming") {
		throw new Error("Unexpected owner control button with outcoming debt");
	}
	if (!receipt.debts.id) {
		return null;
	}

	const commonProps = {
		children: <Icon name="money" className="size-6" />,
		title: t("receipt.controlButton.incomingDebt"),
		variant: "bordered",
		color: "primary",
		isIconOnly: true,
	} as const;
	return receipt.debts.hasMine ? (
		<ButtonLink
			to="/debts/$id"
			hash={receipt.debts.id}
			params={{ id: receipt.debts.id }}
			{...commonProps}
		/>
	) : (
		<ButtonLink to="/debts/intentions" {...commonProps} />
	);
};
