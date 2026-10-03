import type React from "react";

import { Pagination as PaginationRaw } from "@heroui/react";

export type Props = {
	className?: string;
	isDisabled?: boolean;
	total: number;
	page: number;
	siblings?: number;
	boundaries?: number;
	showControls?: boolean;
	dotsJump?: number;
	loop?: boolean;
	onChange?: (page: number) => void;
};

const getPages = (
	page: number,
	total: number,
	siblings: number,
	boundaries: number,
) => {
	const pages = Array.from({ length: total }, (_, index) => index + 1).filter(
		(value) =>
			value <= boundaries ||
			value > total - boundaries ||
			Math.abs(value - page) <= siblings,
	);
	const range: (number | "dots")[] = [];
	for (const value of pages) {
		const previous = range.at(-1);
		if (typeof previous === "number" && value > previous + 1) {
			if (value === previous + 2) {
				range.push(previous + 1);
			} else {
				range.push("dots");
			}
		}
		range.push(value);
	}
	return range;
};

export const Pagination: React.FC<Props> = ({
	total,
	page,
	onChange,
	className,
	isDisabled,
	showControls = true,
	siblings = 1,
	boundaries = 1,
	dotsJump = 5,
	loop,
}) => {
	const pages = getPages(page, total, siblings, boundaries);
	return (
		<PaginationRaw className={className} size="lg">
			<PaginationRaw.Content>
				{showControls ? (
					<PaginationRaw.Previous
						isDisabled={isDisabled || (!loop && page <= 1)}
						onPress={() => onChange?.(page <= 1 ? total : page - 1)}
					>
						‹
					</PaginationRaw.Previous>
				) : null}
				{pages.map((item, index) =>
					item === "dots" ? (
						<PaginationRaw.Item key={`dots-after-${pages[index - 1]}`}>
							<button
								type="button"
								disabled={isDisabled}
								onClick={() =>
									onChange?.(
										Math.max(
											1,
											Math.min(
												total,
												page +
													(index < pages.indexOf(page) ? -dotsJump : dotsJump),
											),
										),
									)
								}
							>
								<PaginationRaw.Ellipsis />
							</button>
						</PaginationRaw.Item>
					) : (
						<PaginationRaw.Item key={item}>
							<PaginationRaw.Link
								isActive={item === page}
								isDisabled={isDisabled}
								onPress={() => onChange?.(item)}
							>
								{item}
							</PaginationRaw.Link>
						</PaginationRaw.Item>
					),
				)}
				{showControls ? (
					<PaginationRaw.Next
						isDisabled={isDisabled || (!loop && page >= total)}
						onPress={() => onChange?.(page >= total ? 1 : page + 1)}
					>
						›
					</PaginationRaw.Next>
				) : null}
			</PaginationRaw.Content>
		</PaginationRaw>
	);
};
