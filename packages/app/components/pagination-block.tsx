import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import { Pagination } from "~components/pagination";
import { Select, SelectItem } from "~components/select";
import { cn } from "~components/utils";

type ShapeProps = {
	limit: number;
	totalCount: number;
	offset: number;
	onLimitChange?: (selected: number) => void;
	onPageChange?: (selected: number) => void;
	isDisabled?: boolean;
};

const PaginationBlockShape: React.FC<ShapeProps> = ({
	limit,
	totalCount,
	offset,
	onLimitChange,
	onPageChange,
	isDisabled,
}) => {
	const { t } = useTranslation("default");
	return (
		<View
			className={cn(
				"flex flex-col-reverse items-end gap-4 sm:flex-row sm:justify-end",
				{
					"sm:justify-between": totalCount > limit,
				},
			)}
		>
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
			) : null}
			{totalCount <= DEFAULT_LIMIT ? null : (
				<Select
					aria-label={t("components.pagination.label")}
					className="max-w-40 justify-self-end"
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
	);
};

export const PaginationBlockSkeleton: React.FC<{ limit: number }> = ({
	limit,
}) => (
	<PaginationBlockShape limit={limit} offset={0} totalCount={50} isDisabled />
);

type Props = Omit<ShapeProps, "onLimitChange" | "onPageChange"> & {
	setLimit: React.Dispatch<React.SetStateAction<number>>;
	onPageChange: (page: number) => void;
};

export const PaginationBlock: React.FC<Props> = ({
	totalCount,
	limit,
	setLimit,
	offset,
	onPageChange,
}) =>
	totalCount ? (
		<PaginationBlockShape
			limit={limit}
			offset={offset}
			onPageChange={onPageChange}
			totalCount={totalCount}
			onLimitChange={setLimit}
		/>
	) : null;
