import React from "react";

import { useTranslation } from "react-i18next";

import { Button, ButtonGroup } from "~components/button";

type Mode = "single" | "multiple";
type Props = {
	mode: Mode;
	onChange: (mode: Mode) => void;
	isDisabled?: boolean;
};

export const ReceiptModeButtons: React.FC<Props> = ({
	mode,
	onChange,
	isDisabled,
}) => {
	const { t } = useTranslation("receipts");
	return (
		<ButtonGroup className="w-full">
			<Button
				className="flex-1"
				color="primary"
				variant={mode === "single" ? "solid" : "bordered"}
				isDisabled={isDisabled}
				onPress={() => onChange("single")}
			>
				{t("receipt.mode.single")}
			</Button>
			<Button
				className="flex-1"
				color="primary"
				variant={mode === "multiple" ? "solid" : "bordered"}
				isDisabled={isDisabled}
				onPress={() => onChange("multiple")}
			>
				{t("receipt.mode.multiple")}
			</Button>
		</ButtonGroup>
	);
};
