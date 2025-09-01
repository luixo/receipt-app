import React from "react";

import { useTranslation } from "react-i18next";

import { StoreDataContext } from "~app/contexts/store-data-context";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import { Select, SelectItem } from "~components/select";

export const DefaultLimitOption = () => {
	const { t } = useTranslation("default");
	const {
		[LIMIT_STORE_NAME]: [defaultLimit, onLimitChange],
	} = React.use(StoreDataContext);
	return (
		<Select
			aria-label={t("components.pagination.label")}
			className="max-w-40 shrink-0 justify-self-end"
			selectedKeys={defaultLimit ? [defaultLimit.toString()] : []}
			onSelectionChange={(selected) =>
				onLimitChange(
					selected instanceof Set
						? Number(Array.from(selected)[0])
						: DEFAULT_LIMIT,
				)
			}
		>
			{LIMITS.map((limitItem) => (
				<SelectItem
					key={limitItem}
					textValue={t("components.pagination.perPage", {
						limit: limitItem,
					})}
				>
					{limitItem}
				</SelectItem>
			))}
		</Select>
	);
};
