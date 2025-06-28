import type React from "react";
import { View } from "react-native";

import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import { Pagination } from "~components/pagination";
import { Select, SelectItem } from "~components/select";
import { cn } from "~components/utils";

type Props = {
	totalCount?: number;
	limit: number;
	setLimit: React.Dispatch<React.SetStateAction<number>>;
	props: React.ComponentProps<typeof Pagination>;
};

export const PaginationBlock: React.FC<Props> = ({
	totalCount,
	limit,
	setLimit,
	props,
}) => {
	if (!totalCount) {
		return null;
	}
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
					{...props}
				/>
			) : null}
			{totalCount <= DEFAULT_LIMIT ? null : (
				<Select
					aria-label="Items per page"
					className="max-w-40 justify-self-end"
					selectedKeys={[limit.toString()]}
					onSelectionChange={(selected) =>
						setLimit(
							selected instanceof Set
								? Number(Array.from(selected)[0])
								: DEFAULT_LIMIT,
						)
					}
				>
					{LIMITS.map((limitItem) => (
						<SelectItem key={limitItem} textValue={`${limitItem} / page`}>
							{limitItem}
						</SelectItem>
					))}
				</Select>
			)}
		</View>
	);
};
