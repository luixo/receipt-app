import React from "react";

import {
	Loading,
	Text,
	Button,
	styled,
	Grid,
	Checkbox,
	Dropdown,
} from "@nextui-org/react";
import {
	BsSortNumericDown as SortDownIcon,
	BsSortNumericUp as SortUpIcon,
} from "react-icons/bs";
import { MdFilterAlt as FilterIcon } from "react-icons/md";

import { cache } from "app/cache";
import { ExtractInfiniteData } from "app/cache/utils";
import { IconButton } from "app/components/icon-button";
import { CursorPagingResult } from "app/hooks/use-cursor-paging";
import { useMatchMedia } from "app/hooks/use-match-media";
import { TRPCInfiniteQuerySuccessResult } from "app/trpc";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
});

const GridElement = styled(Grid, {
	p: 0,
	alignItems: "center",
	justifyContent: "center",
});

type Props = {
	cursorPaging: CursorPagingResult<
		ExtractInfiniteData<
			TRPCInfiniteQuerySuccessResult<"receipts.get-paged">["data"]
		>
	>;
};

export const ReceiptsPagination: React.FC<Props> = ({ cursorPaging }) => {
	const [input, { changeOrderBy, changeOnlyNonResolved }] =
		cache.receipts.getPaged.useStore();
	const {
		onNextPage,
		onPrevPage,
		selectedPageIndex,
		prevDisabled,
		prevLoading,
		nextDisabled,
		nextLoading,
		totalCount,
	} = cursorPaging;

	const matchMedia = useMatchMedia();
	const shouldShrink = !matchMedia.md;
	const shouldSuperShrink = !matchMedia.xs;

	const sortSelectOnClick = () =>
		changeOrderBy(input.orderBy === "date-desc" ? "date-asc" : "date-desc");
	const SortIcon = input.orderBy === "date-desc" ? SortDownIcon : SortUpIcon;
	const sortSelectIcon = <SortIcon size={24} />;
	const sortSelectText =
		input.orderBy === "date-desc" ? "Newest first" : "Oldest first";

	const switchNonResolvedIcon = (
		<Checkbox
			aria-label="Switch show only non-resolved receipts"
			isSelected={input.onlyNonResolved}
			onChange={changeOnlyNonResolved}
		/>
	);
	const switchNonResolvedText = "Show only non-resolved";
	const switchNonResolvedOnClick = React.useCallback(
		() => changeOnlyNonResolved(!input.onlyNonResolved),
		[changeOnlyNonResolved, input.onlyNonResolved]
	);

	return (
		<Wrapper>
			<Grid.Container gap={2} justify="space-between">
				{shouldShrink ? (
					shouldSuperShrink ? null : (
						<GridElement xs={2} />
					)
				) : (
					<GridElement xs={4} justify="flex-start">
						<IconButton
							light
							auto
							iconLeftCss={{ mr: "$4" }}
							icon={sortSelectIcon}
							onClick={sortSelectOnClick}
							animated={false}
						>
							{sortSelectText}
						</IconButton>
					</GridElement>
				)}
				<GridElement xs={shouldShrink ? true : 4}>
					<Button.Group size="sm">
						<Button
							onClick={prevLoading ? undefined : onPrevPage}
							disabled={prevDisabled}
						>
							{"<"}
						</Button>
						<Button>
							{selectedPageIndex + 1} of{" "}
							{totalCount ? Math.ceil(totalCount / input.limit) : "unknown"}
						</Button>
						<Button
							onClick={nextLoading ? undefined : onNextPage}
							disabled={nextDisabled}
						>
							{nextLoading ? <Loading color="currentColor" size="xs" /> : ">"}
						</Button>
					</Button.Group>
				</GridElement>
				{shouldShrink ? (
					<GridElement xs={2}>
						<Dropdown closeOnSelect={false}>
							<Dropdown.Button flat size="sm">
								<FilterIcon size={24} />
							</Dropdown.Button>
							<Dropdown.Menu aria-label="Static Actions">
								<Dropdown.Item icon={sortSelectIcon}>
									<Text onClick={sortSelectOnClick}>{sortSelectText}</Text>
								</Dropdown.Item>
								<Dropdown.Item icon={switchNonResolvedIcon}>
									<Text onClick={switchNonResolvedOnClick}>
										{switchNonResolvedText}
									</Text>
								</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown>
					</GridElement>
				) : (
					<GridElement xs={4} justify="flex-end">
						<IconButton
							light
							auto
							iconLeftCss={{ mr: "$4" }}
							icon={switchNonResolvedIcon}
							onClick={switchNonResolvedOnClick}
							animated={false}
						>
							{switchNonResolvedText}
						</IconButton>
					</GridElement>
				)}
			</Grid.Container>
		</Wrapper>
	);
};
