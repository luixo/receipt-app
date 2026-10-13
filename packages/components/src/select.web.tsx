import type React from "react";

import { ListBox, Select as SelectRaw } from "@heroui/react";

import type { MaybeText } from "./text.web";
import { cn } from "./utils";
import type { ViewReactNode } from "./view.web";

export type Props<T extends object, K extends string> = {
	label?: string;
	placeholder: string;
	selectionMode?: "multiple" | "single";
	items: T[];
	selectedKeys?: K[];
	disabledKeys?: K[];
	renderValue: (selectedValues: T[]) => MaybeText | ViewReactNode;
	onSelectionChange: (selectedKeys: K[]) => void;
	className?: string;
	isDisabled?: boolean;
	children: (item: T) => React.ReactNode;
	getKey: (item: T) => K;
	getTextValue?: (item: T) => string;
	disallowEmptySelection?: boolean;
	testID?: string;
	variant?: React.ComponentProps<typeof SelectRaw>["variant"];
};

// Generic component has to be a function
// oxlint-disable-next-line func-style
export function Select<T extends object, K extends string>({
	children,
	getKey,
	getTextValue,
	renderValue,
	onSelectionChange,
	label,
	testID,
	items,
	selectedKeys,
	disabledKeys,
	selectionMode,
	placeholder,
	className,
	isDisabled,
	disallowEmptySelection,
	variant,
}: Props<T, K>) {
	return (
		<SelectRaw
			value={
				selectionMode === "multiple"
					? (selectedKeys ?? [])
					: (selectedKeys?.[0] ?? null)
			}
			selectionMode={selectionMode ?? "single"}
			disabledKeys={disabledKeys}
			placeholder={placeholder}
			className={cn("min-h-10 min-w-32", className)}
			isDisabled={isDisabled}
			data-testid={testID}
			aria-label={label}
			onChange={(keys) => {
				const nextKeys = (
					Array.isArray(keys) ? keys : keys === null ? [] : [keys]
				) as K[];
				if (disallowEmptySelection && nextKeys.length === 0) {
					return;
				}
				onSelectionChange(nextKeys);
			}}
			variant={variant}
		>
			<SelectRaw.Trigger className="flex-1 items-center px-2 py-1">
				<SelectRaw.Value className="overflow-hidden">
					{({ isPlaceholder, defaultChildren }) =>
						isPlaceholder
							? defaultChildren
							: renderValue(
									items.filter((item) => selectedKeys?.includes(getKey(item))),
								)
					}
				</SelectRaw.Value>
				<SelectRaw.Indicator />
			</SelectRaw.Trigger>
			<SelectRaw.Popover>
				<ListBox items={items}>
					{(item: T) => (
						<ListBox.Item
							id={getKey(item)}
							textValue={getTextValue?.(item) ?? getKey(item)}
						>
							{children(item)}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					)}
				</ListBox>
			</SelectRaw.Popover>
		</SelectRaw>
	);
}
