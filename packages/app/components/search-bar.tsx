import React from "react";

import { useTranslation } from "react-i18next";

import { useDebouncedValue } from "~app/hooks/use-debounced-value";
import { SearchIcon } from "~components/icons";
import { Input } from "~components/input";

const SEARCH_BAR_DEBOUNCE = 500;

export const SearchBar: React.FC<
	Omit<React.ComponentProps<typeof Input>, "value" | "onValueChange"> & {
		initialValue: string;
		onValueChange: React.Dispatch<string>;
	}
> = ({ startContent, initialValue, onValueChange, ...props }) => {
	const { t } = useTranslation("default");
	const [input, setInput] = React.useState(initialValue);
	const effectiveInput = useDebouncedValue(input, SEARCH_BAR_DEBOUNCE);
	React.useEffect(() => {
		onValueChange(effectiveInput);
	}, [effectiveInput, onValueChange]);
	return (
		<Input
			startContent={
				<>
					<SearchIcon size={20} />
					{startContent}
				</>
			}
			value={input}
			onValueChange={setInput}
			placeholder={t("searchBar.placeholder")}
			isClearable
			{...props}
		/>
	);
};
