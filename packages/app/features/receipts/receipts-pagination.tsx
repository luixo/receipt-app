import React from "react";

import {
	Loading,
	Text,
	Button,
	styled,
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
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { CursorPagingResult } from "app/hooks/use-cursor-paging";
import { useMatchMedia } from "app/hooks/use-match-media";
import { TRPCInfiniteQuerySuccessResult } from "app/trpc";

const Wrapper = styled("div", {
	display: "flex",
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
			<Grid.Container justify="space-between">
				{shouldShrink ? (
					<Grid defaultCol={1} lessXsCol={0} />
				) : (
					<Grid defaultCol={4} justify="flex-start">
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
					</Grid>
				)}
				<Grid defaultCol={4} lessMdCol>
					<Button.Group size="sm" bordered>
						<Button
							onClick={prevLoading ? undefined : onPrevPage}
							disabled={prevDisabled}
							css={{ borderRight: "none" }}
						>
							{"<"}
						</Button>
						<Button animated={false} css={{ borderRight: "none" }}>
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
				</Grid>
				{shouldShrink ? (
					<Grid defaultCol={3}>
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
					</Grid>
				) : (
					<Grid defaultCol={4} justify="flex-end">
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
					</Grid>
				)}
			</Grid.Container>
		</Wrapper>
	);
};
