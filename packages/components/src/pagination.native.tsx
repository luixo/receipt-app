import React from "react";

import { tv } from "tailwind-variants";

import { Icon } from "~components/icons";
import type { Props } from "~components/pagination";
import { Text } from "~components/text";
import { View } from "~components/view";

const pagination = tv({
	slots: {
		base: "overflow-x-scroll p-2.5",
		wrapper: "rounded-medium flex flex-row gap-1",
		item: "border-default text-default-foreground text-medium rounded-medium box-border flex h-10 min-w-10 items-center justify-center truncate border-[2px] bg-transparent shadow-xs",
	},
	variants: {
		isDisabled: {
			true: {
				item: "text-default-300 pointer-events-none",
			},
			false: {},
		},
		isSelected: {
			true: {
				item: "text-primary-foreground bg-primary border-primary",
			},
			false: {},
		},
	},
	defaultVariants: {
		isDisabled: false,
		isSelected: false,
	},
});

type PaginationItemType = "next" | "prev" | "dots" | number;

const getRange = (start: number, end: number) => {
	const length = end - start + 1;
	return Array.from({ length }, (_, index) => index + start);
};

const usePagination = ({
	page = 1,
	total = 1,
	siblings = 1,
	boundaries = 1,
	showControls = false,
	loop,
	onChange,
}: Pick<
	Props,
	| "page"
	| "total"
	| "siblings"
	| "boundaries"
	| "showControls"
	| "onChange"
	| "loop"
>) => {
	const [activePage, setActivePage] = React.useState(page);
	const paginationRange = React.useMemo<PaginationItemType[]>(() => {
		const formatRange = (
			inputRange: PaginationItemType[],
		): PaginationItemType[] => {
			if (showControls) {
				return ["prev", ...inputRange, "next"];
			}
			return inputRange;
		};
		const totalPageNumbers = siblings * 2 + 3 + boundaries * 2;
		if (totalPageNumbers >= total) {
			return formatRange(getRange(1, total));
		}
		const leftSiblingIndex = Math.max(activePage - siblings, boundaries);
		const rightSiblingIndex = Math.min(
			activePage + siblings,
			total - boundaries,
		);
		const shouldShowLeftDots = leftSiblingIndex > boundaries + 2;
		const shouldShowRightDots = rightSiblingIndex < total - (boundaries + 1);
		if (!shouldShowLeftDots && shouldShowRightDots) {
			const leftItemCount = siblings * 2 + boundaries + 2;
			return formatRange([
				...getRange(1, leftItemCount),
				"dots",
				...getRange(total - (boundaries - 1), total),
			]);
		}
		if (shouldShowLeftDots && !shouldShowRightDots) {
			const rightItemCount = boundaries + 1 + 2 * siblings;
			return formatRange([
				...getRange(1, boundaries),
				"dots",
				...getRange(total - rightItemCount, total),
			]);
		}
		return formatRange([
			...getRange(1, boundaries),
			"dots",
			...getRange(leftSiblingIndex, rightSiblingIndex),
			"dots",
			...getRange(total - boundaries + 1, total),
		]);
	}, [total, activePage, siblings, boundaries, showControls]);
	const setPage = React.useCallback(
		(pageNumber: number) => {
			const onChangeActivePage = (newPage: number) => {
				setActivePage(newPage);
				onChange?.(newPage);
			};
			if (pageNumber <= 0) {
				onChangeActivePage(1);
			} else if (pageNumber > total) {
				onChangeActivePage(total);
			} else {
				onChangeActivePage(pageNumber);
			}
		},
		[total, onChange],
	);

	const next = () => setPage(activePage + 1);
	const previous = () => setPage(activePage - 1);
	const first = () => setPage(1);
	const last = () => setPage(total);
	const onNext = () => {
		if (loop && activePage === total) {
			return first();
		}
		return next();
	};
	const onPrevious = () => {
		if (loop && activePage === 1) {
			return last();
		}
		return previous();
	};
	return { range: paginationRange, activePage, setPage, onPrevious, onNext };
};

export const Pagination: React.FC<Props> = ({
	className,
	isDisabled,
	total,
	page,
	siblings,
	boundaries,
	showControls,
	dotsJump = 5,
	loop,
	onChange,
}) => {
	const { range, activePage, setPage, onPrevious, onNext } = usePagination({
		page,
		total,
		siblings,
		boundaries,
		showControls,
		loop,
		onChange,
	});
	const slots = pagination();

	const renderItem = (value: PaginationItemType, index: number) => {
		switch (value) {
			case "prev": {
				const isButtonDisabled = isDisabled || (!loop && activePage === 1);
				return (
					<View
						key="prev"
						className={slots.item({ isDisabled: isButtonDisabled })}
						onPress={isButtonDisabled ? undefined : onPrevious}
					>
						<Icon name="chevron-down" className="size-4 rotate-90" />
					</View>
				);
			}
			case "next": {
				const isButtonDisabled = isDisabled || (!loop && activePage === total);
				return (
					<View
						key="next"
						className={slots.item({ isDisabled: isButtonDisabled })}
						onPress={isButtonDisabled ? undefined : onNext}
					>
						<Icon name="chevron-down" className="size-4 -rotate-90" />
					</View>
				);
			}
			case "dots":
				return (
					<View
						key="dots"
						role="button"
						className={slots.item()}
						onPress={() =>
							index < range.indexOf(activePage)
								? setPage(Math.max(activePage - dotsJump, 1))
								: setPage(Math.min(activePage + dotsJump, total))
						}
					>
						<Icon name="ellipsis" className="size-4" />
					</View>
				);
			default:
				return (
					<View
						key={value}
						className={slots.item({ isSelected: value === activePage })}
						onPress={() => setPage(value)}
					>
						<Text>{value}</Text>
					</View>
				);
		}
	};
	return (
		<View role="navigation" className={slots.base({ className })}>
			<View className={slots.wrapper()}>{range.map(renderItem)}</View>
		</View>
	);
};
