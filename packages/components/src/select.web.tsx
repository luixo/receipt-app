import type React from "react";

import { SelectItem, Select as SelectRaw } from "@heroui/select";
import { isNonNullish } from "remeda";

export type Props<T extends object, K extends string> = {
	label?: string;
	placeholder: string;
	selectionMode?: "multiple" | "single";
	items: T[];
	selectedKeys?: K[];
	disabledKeys?: K[];
	renderValue: (selectedValues: T[]) => React.ReactNode;
	onSelectionChange: (selectedKeys: K[]) => void;
	className?: string;
	isDisabled?: boolean;
	children: (item: T) => React.ReactNode;
	getKey: (item: T) => K;
	getTextValue?: (item: T) => string;
	disallowEmptySelection?: boolean;
};

// eslint-disable-next-line react/function-component-definition
export function Select<T extends object, K extends string>({
	children,
	getKey,
	getTextValue,
	renderValue,
	onSelectionChange,
	label,
	...props
}: Props<T, K>) {
	return (
		<SelectRaw<T>
			{...props}
			aria-label={label}
			renderValue={(values) =>
				renderValue(values.map((value) => value.data).filter(isNonNullish))
			}
			onSelectionChange={(keys) => {
				onSelectionChange(
					keys === "all" ? props.items.map(getKey) : (Array.from(keys) as K[]),
				);
			}}
		>
			{(item) => (
				<SelectItem
					key={getKey(item)}
					textValue={getTextValue ? getTextValue(item) : getKey(item)}
				>
					{children(item)}
				</SelectItem>
			)}
		</SelectRaw>
	);
}
