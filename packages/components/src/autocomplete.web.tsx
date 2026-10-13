import React from "react";

import { ComboBox, Header, Label, ListBox } from "@heroui/react";

import { Input } from "~components/input";
import type { ViewReactNode } from "~components/view";

export type Props = {
	inputValue?: string;
	onInputChange?: (value: string) => void;
	placeholder?: string;
	isDisabled?: boolean;
	children: {
		key: string;
		title?: string;
		items: {
			key: string;
			className?: string;
			textValue: string;
			children?: ViewReactNode;
		}[];
	}[];
	label?: string;
	endContent?: ViewReactNode;
	selectedKey: string | null;
	onSelectionChange: (nextKey: string | null) => void;
	emptyContent: string;
	isClearable?: boolean;
	scroll?: {
		loadMore: () => void;
		hasMore: boolean;
		isDisabled?: boolean;
	};
	variant?: React.ComponentProps<typeof ComboBox>["variant"];
};

export const Autocomplete: React.FC<Props> = ({
	children,
	emptyContent,
	isClearable,
	onSelectionChange,
	scroll,
	selectedKey,
	inputValue,
	onInputChange,
	isDisabled,
	label,
	placeholder,
	endContent,
	variant,
}) => {
	const listRef = React.useRef<HTMLDivElement>(null);
	const onScroll = () => {
		const list = listRef.current;
		if (
			scroll &&
			!scroll.isDisabled &&
			scroll.hasMore &&
			list &&
			list.scrollTop + list.clientHeight >= list.scrollHeight - 80
		) {
			scroll.loadMore();
		}
	};
	return (
		<ComboBox
			value={selectedKey}
			onChange={(nextSelection) =>
				onSelectionChange(
					nextSelection === null ? null : nextSelection.toString(),
				)
			}
			inputValue={inputValue}
			onInputChange={onInputChange}
			isDisabled={isDisabled}
			variant={variant}
			className="w-full"
		>
			{label ? <Label>{label}</Label> : null}
			<Input
				className="w-full"
				placeholder={placeholder}
				isClearable={isClearable}
				endContent={
					<>
						{endContent}
						<ComboBox.Trigger className="relative translate-0 self-center" />
					</>
				}
				variant={variant}
			/>
			<ComboBox.Popover>
				<div
					ref={listRef}
					onScroll={onScroll}
					className="max-h-64 overflow-y-auto"
				>
					<ListBox renderEmptyState={() => emptyContent}>
						{children.map(({ items, key, title }) => (
							<ListBox.Section key={key} id={key}>
								{title ? <Header>{title}</Header> : null}
								{items.map(
									({
										key: itemKey,
										className,
										textValue,
										children: content,
									}) => (
										<ListBox.Item
											key={itemKey}
											id={itemKey}
											textValue={textValue}
											className={className}
										>
											{content ?? textValue}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									),
								)}
							</ListBox.Section>
						))}
					</ListBox>
				</div>
			</ComboBox.Popover>
		</ComboBox>
	);
};
