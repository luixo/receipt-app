import React from "react";

import type { PopoverTriggerRef } from "heroui-native";
import { Popover } from "heroui-native";

import type { Props } from "~components/autocomplete";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { ScrollView } from "~components/scroll-view";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

export const Autocomplete: React.FC<Props> = ({
	inputValue,
	onInputChange,
	label,
	placeholder,
	selectedKey,
	onSelectionChange,
	endContent,
	isDisabled,
	emptyContent,
	onClear,
	children,
	scroll,
}) => {
	const popoverRef = React.useRef<PopoverTriggerRef>(null);
	const onScroll: NonNullable<
		React.ComponentProps<typeof ScrollView>["onScroll"]
	> = (event) => {
		if (!scroll) {
			return;
		}
		const { nativeEvent } = event;
		if (
			nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
				nativeEvent.contentSize.height &&
			scroll.hasMore &&
			!scroll.isDisabled
		) {
			scroll.loadMore();
		}
	};
	return (
		<Popover>
			<Popover.Trigger ref={popoverRef}>
				<Input
					isDisabled={isDisabled}
					value={inputValue}
					onValueChange={(nextValue) => {
						onInputChange?.(nextValue);
						popoverRef.current?.open();
					}}
					label={label}
					labelPlacement="outside"
					placeholder={placeholder}
					endContent={endContent}
					isClearable={Boolean(onClear)}
					onPress={() => popoverRef.current?.open()}
					onFocus={() => popoverRef.current?.open()}
					onBlur={() => popoverRef.current?.close()}
				/>
			</Popover.Trigger>
			<Popover.Portal forceMount>
				<Popover.Overlay />
				<Popover.Content className="w-full gap-1 p-2" width="trigger">
					<ScrollView className="max-h-[200px]" onScroll={onScroll}>
						{children.length === 0
							? emptyContent
							: children.map(({ key, title, items }) => (
									<View key={key} className="flex-1 flex-col gap-1">
										{title ? (
											<Text className="text-tiny text-foreground-500">
												{title}
											</Text>
										) : null}
										{items.map(
											({
												key: itemKey,
												className: itemClassName,
												textValue,
												children: itemChildren,
											}) => (
												<View
													key={itemKey}
													className={cn(
														"flex-1 flex-row items-center justify-between p-1",
														itemClassName,
													)}
													onPress={() =>
														onSelectionChange(
															selectedKey === textValue ? null : textValue,
														)
													}
												>
													{itemChildren}
													{selectedKey === textValue ? (
														<Icon name="check" className="size-4" />
													) : null}
												</View>
											),
										)}
									</View>
								))}
					</ScrollView>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
};
