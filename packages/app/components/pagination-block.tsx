import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { SearchBar } from "~app/components/search-bar";
import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import { Checkbox } from "~components/checkbox";
import { Pagination } from "~components/pagination";
import { Select, SelectItem } from "~components/select";
import { cn } from "~components/utils";

type ShapeProps<T> = {
	limit: number;
	totalCount: number;
	offset: number;
	onLimitChange?: (selected: number) => void;
	onPageChange?: (selected: number) => void;
	isDisabled?: boolean;
	selection?: {
		items: T[];
		selectedItems: T[];
		setSelectedItems: React.Dispatch<React.SetStateAction<T[]>>;
	};
	search?: React.ComponentProps<typeof SearchBar>;
	endContent?: React.ReactNode;
};

// eslint-disable-next-line react/function-component-definition
export function PaginationBlockShape<T>({
	limit,
	totalCount,
	offset,
	onLimitChange,
	onPageChange,
	isDisabled,
	selection,
	endContent,
	search,
}: ShapeProps<T>) {
	const { t } = useTranslation("default");
	const selectedStatus = selection
		? selection.selectedItems.length === selection.items.length
			? "selected-full"
			: selection.selectedItems.length === 0
				? "empty"
				: "selected-partial"
		: undefined;

	return (
		<>
			<View
				className={cn(
					"flex flex-col-reverse items-end gap-4 sm:flex-row sm:justify-end",
					{
						"sm:justify-between": totalCount > limit,
					},
				)}
			>
				<View className="flex w-full flex-row items-center justify-between gap-2 sm:w-auto">
					{selection ? (
						<View className="flex items-center justify-center p-2">
							<Checkbox
								isSelected={selectedStatus !== "empty"}
								isIndeterminate={selectedStatus === "selected-partial"}
								onValueChange={() =>
									selection.setSelectedItems(
										selectedStatus === "selected-full" ? [] : selection.items,
									)
								}
								color="secondary"
								classNames={{ wrapper: "me-0" }}
							/>
						</View>
					) : null}
					{totalCount > limit ? (
						<Pagination
							className="self-center"
							color="primary"
							size="lg"
							variant="bordered"
							isDisabled={isDisabled}
							total={Math.ceil(totalCount / limit)}
							page={totalCount === 0 ? 0 : offset / limit + 1}
							onChange={onPageChange}
						/>
					) : search ? (
						<SearchBar className={"block sm:hidden"} {...search} />
					) : null}
				</View>
				<View className="flex flex-1 flex-row items-center justify-end gap-2">
					{search ? (
						<SearchBar
							className={cn(
								"block",
								totalCount <= limit ? "max-sm:hidden" : "sm:hidden",
							)}
							{...search}
						/>
					) : null}
					{endContent}
					{totalCount <= DEFAULT_LIMIT ? null : (
						<Select
							aria-label={t("components.pagination.label")}
							className="max-w-40 shrink-0 justify-self-end"
							selectedKeys={[limit.toString()]}
							onSelectionChange={(selected) =>
								onLimitChange?.(
									selected instanceof Set
										? Number(Array.from(selected)[0])
										: DEFAULT_LIMIT,
								)
							}
							isDisabled={isDisabled}
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
					)}
				</View>
			</View>
			{search ? (
				<SearchBar
					className={cn("hidden", totalCount > limit ? "sm:block" : undefined)}
					{...search}
				/>
			) : null}
		</>
	);
}

export const PaginationBlockSkeleton: React.FC<{ limit: number }> = ({
	limit,
}) => (
	<PaginationBlockShape limit={limit} offset={0} totalCount={50} isDisabled />
);

type Props<T> = Omit<ShapeProps<T>, "onLimitChange" | "onPageChange"> & {
	setLimit: React.Dispatch<React.SetStateAction<number>>;
	onPageChange: (page: number) => void;
};

// eslint-disable-next-line react/function-component-definition
export function PaginationBlock<T>({
	totalCount,
	setLimit,
	...props
}: Props<T>) {
	return totalCount ? (
		<PaginationBlockShape<T>
			totalCount={totalCount}
			onLimitChange={setLimit}
			{...props}
		/>
	) : null;
}
