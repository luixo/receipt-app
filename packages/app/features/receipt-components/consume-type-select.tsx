import type React from "react";

import { useTranslation } from "react-i18next";

import type { ConsumeType } from "~app/utils/consume-type";
import { Select } from "~components/select";
import { Text } from "~components/text";

type Props = {
	value: ConsumeType | null;
	onChange: (value: ConsumeType | null) => void;
	isDisabled: boolean;
	allowDefault?: boolean;
	className?: string;
};

const types = ["parts", "percent", "amount"] as const;

export const ConsumeTypeSelect: React.FC<Props> = ({
	value,
	onChange,
	isDisabled,
	allowDefault = false,
	className,
}) => {
	const { t } = useTranslation("receipts");
	const items = (allowDefault ? (["default", ...types] as const) : types).map(
		(key) => ({ key, label: t(`consumeType.${key}` as const) }),
	);
	return (
		<Select
			label={t("consumeType.label")}
			placeholder={t("consumeType.label")}
			className={className}
			isDisabled={isDisabled}
			selectionMode="single"
			disallowEmptySelection
			items={items}
			selectedKeys={[value ?? "default"]}
			getKey={({ key }) => key}
			renderValue={(selected) => selected[0]?.label ?? ""}
			onSelectionChange={([key]) => {
				if (key) {
					onChange(key === "default" ? null : key);
				}
			}}
		>
			{({ label }) => <Text>{label}</Text>}
		</Select>
	);
};
