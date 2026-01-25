import { Select as SelectRaw } from "heroui-native";

import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { cn } from "~components/utils";

import type { Props } from "./select";

export const Select = <T extends object>({
	placeholder,
	selectionMode,
	items,
	selectedKeys = [],
	disabledKeys,
	renderValue,
	onSelectionChange,
	className,
	isDisabled,
	children,
	getKey,
	getTextValue: getTextValueRaw,
}: Props<T>) => {
	const selectedMatches = items.filter((item) =>
		selectedKeys.includes(getKey(item)),
	);
	const getTextValue = (item: T) =>
		getTextValueRaw ? getTextValueRaw(item) : getKey(item);
	const renderedValue = renderValue(selectedMatches);
	return (
		<SelectRaw
			isDisabled={isDisabled}
			className={className}
			value={
				selectedMatches[0]
					? {
							value: getKey(selectedMatches[0]),
							label: getTextValue(selectedMatches[0]),
						}
					: undefined
			}
			onValueChange={(nextValue) => {
				if (!nextValue) {
					onSelectionChange([]);
					return;
				}
				if (selectedKeys.includes(nextValue.value)) {
					onSelectionChange(
						selectedKeys.filter((key) => key !== nextValue.value),
					);
				} else {
					onSelectionChange(
						selectionMode === "multiple"
							? [...selectedKeys, nextValue.value]
							: [nextValue.value],
					);
				}
			}}
		>
			<SelectRaw.Trigger asChild>
				<Button className="justify-between" isDisabled={isDisabled}>
					{selectedMatches.length === 0 ? (
						<Text className="truncate opacity-50">{placeholder}</Text>
					) : typeof renderedValue === "string" ? (
						<Text className="truncate">{renderedValue}</Text>
					) : (
						renderedValue
					)}
					<Icon name="chevron-down" className="size-5" />
				</Button>
			</SelectRaw.Trigger>
			<SelectRaw.Portal>
				<SelectRaw.Overlay />
				<SelectRaw.Content className="p-2">
					{items.map((item) => {
						const key = getKey(item);
						const label = getTextValue(item);
						const resolvedChildren = children(item);
						const isItemDisabled = disabledKeys?.includes(key);
						return (
							<SelectRaw.Item
								disabled={isItemDisabled}
								key={key}
								value={label}
								label={label}
								className={cn("p-2", isItemDisabled ? "opacity-50" : undefined)}
							>
								{typeof resolvedChildren === "string" ? (
									<Text>{resolvedChildren}</Text>
								) : (
									resolvedChildren
								)}
								<SelectRaw.ItemIndicator
									forceMount={selectedKeys.includes(key) ? true : undefined}
								/>
							</SelectRaw.Item>
						);
					})}
				</SelectRaw.Content>
			</SelectRaw.Portal>
		</SelectRaw>
	);
};
