import type React from "react";

import { useTranslation } from "react-i18next";

import { SearchIcon } from "~components/icons";
import { Input } from "~components/input";

export const SearchBar: React.FC<
	Omit<React.ComponentProps<typeof Input>, "value" | "onValueChange"> & {
		value: string;
		onValueChange: React.Dispatch<string>;
	}
> = ({ startContent, value, onValueChange, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<Input
			startContent={
				<>
					<SearchIcon size={20} />
					{startContent}
				</>
			}
			value={value}
			onValueChange={onValueChange}
			placeholder={t("searchBar.placeholder")}
			isClearable
			{...props}
		/>
	);
};
