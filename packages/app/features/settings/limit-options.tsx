import { useTranslation } from "react-i18next";

import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import { Select } from "~components/select";

export const LimitOption = ({
	limit: selectedValue,
	onChange,
	isDisabled,
}: {
	limit?: number;
	onChange?: (limit: number) => void;
	isDisabled?: boolean;
}) => {
	const { t } = useTranslation("default");
	return (
		<Select
			label={t("components.pagination.label")}
			className="max-w-40 shrink-0 justify-self-end"
			selectedKeys={selectedValue ? [selectedValue.toString()] : []}
			onSelectionChange={(selected) =>
				onChange?.(selected[0] ? Number(selected[0]) : DEFAULT_LIMIT)
			}
			isDisabled={isDisabled}
			renderValue={(items) => items.map(({ limit }) => limit).join(", ")}
			items={LIMITS.map((limit) => ({ limit }))}
			getKey={({ limit }) => limit.toString()}
			getTextValue={({ limit }) =>
				t("components.pagination.perPage", { limit })
			}
			placeholder={t("components.pagination.label")}
		>
			{({ limit }) => limit}
		</Select>
	);
};
