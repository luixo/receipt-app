import React from "react";

import { Text, styled, Dropdown, Modal, Card, Spacer } from "@nextui-org/react";
import type { Selection } from "@react-types/shared/src/selection";
import {
	BsSortNumericDown as SortDownIcon,
	BsSortNumericUp as SortUpIcon,
} from "react-icons/bs";
import { MdFilterAlt as FilterIcon } from "react-icons/md";

import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import type { Props as PaginationProps } from "app/components/pagination";
import { Pagination } from "app/components/pagination";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { queries } from "app/queries";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
});

type Props = {
	pagination: PaginationProps;
};

export const ReceiptsPagination: React.FC<Props> = ({ pagination }) => {
	const [{ orderBy, filters = {} }, { changeOrderBy, changeFilters }] =
		queries.receipts.getPaged.useStore();

	const [
		filterModalOpen,
		{ switchValue: switchFilterModal, setFalse: closeFilterModal },
	] = useBooleanState(false);

	const sortSelectOnClick = React.useCallback(
		() => changeOrderBy(orderBy === "date-desc" ? "date-asc" : "date-desc"),
		[changeOrderBy, orderBy],
	);
	const SortIcon = orderBy === "date-desc" ? SortDownIcon : SortUpIcon;

	const onFilterSelectionChange = React.useCallback(
		(filterKey: keyof typeof filters, selection: Selection) => {
			if (selection === "all") {
				return;
			}
			const key = [...selection.values()][0]!;
			switch (key) {
				case "true":
					changeFilters((prev) => ({ ...prev, [filterKey]: true }));
					break;
				case "false":
					changeFilters((prev) => ({ ...prev, [filterKey]: false }));
					break;
				default:
					changeFilters((prev) => ({ ...prev, [filterKey]: undefined }));
			}
		},
		[changeFilters],
	);
	const onResolvedFilterSelectionChange = React.useCallback(
		(selection: Selection) =>
			onFilterSelectionChange("resolvedByMe", selection),
		[onFilterSelectionChange],
	);
	const onOwnedFilterSelectionChange = React.useCallback(
		(selection: Selection) => onFilterSelectionChange("ownedByMe", selection),
		[onFilterSelectionChange],
	);
	const onLockedFilterSelectionChange = React.useCallback(
		(selection: Selection) => onFilterSelectionChange("locked", selection),
		[onFilterSelectionChange],
	);

	return (
		<Wrapper>
			<Grid.Container justify="space-between">
				<Grid defaultCol={4} lessMdCol={0} />
				<Grid defaultCol={4} lessMdCol css={{ justifyContent: "center" }}>
					<Pagination {...pagination} />
				</Grid>
				<Grid defaultCol={4} lessMdCol={2} css={{ justifyContent: "flex-end" }}>
					<IconButton
						icon={<FilterIcon size={24} />}
						onClick={switchFilterModal}
					/>
				</Grid>
				<Modal
					open={filterModalOpen}
					onClose={closeFilterModal}
					css={{ p: "$10" }}
				>
					<IconButton
						light
						auto
						iconLeftCss={{ mr: "$4" }}
						icon={<SortIcon size={24} />}
						onClick={sortSelectOnClick}
						animated={false}
					>
						{orderBy === "date-desc" ? "Newest first" : "Oldest first"}
					</IconButton>
					<Spacer y={1} />
					<Card.Divider />
					<Spacer y={0.5} />
					<Text h3>Filters</Text>
					<Spacer y={0.5} />
					<Dropdown>
						<Dropdown.Button flat auto>
							{filters.resolvedByMe === undefined
								? "Any resolved by me status"
								: filters.resolvedByMe
								? "Only resolved by me"
								: "Only non-resolved by me"}
						</Dropdown.Button>
						<Dropdown.Menu
							aria-label="Resolved by me filter"
							disallowEmptySelection
							selectionMode="single"
							selectedKeys={new Set([String(filters.resolvedByMe)])}
							onSelectionChange={onResolvedFilterSelectionChange}
						>
							<Dropdown.Item key="undefined">
								Any resolved by me status
							</Dropdown.Item>
							<Dropdown.Item key="true">Only resolved</Dropdown.Item>
							<Dropdown.Item key="false">Only non-resolved</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
					<Spacer y={0.5} />
					<Dropdown>
						<Dropdown.Button flat auto>
							{filters.ownedByMe === undefined
								? "Owned by anybody"
								: filters.ownedByMe
								? "Owned by me"
								: "Owned by anybody but me"}
						</Dropdown.Button>
						<Dropdown.Menu
							aria-label="Owned by me filter"
							disallowEmptySelection
							selectionMode="single"
							selectedKeys={new Set([String(filters.ownedByMe)])}
							onSelectionChange={onOwnedFilterSelectionChange}
						>
							<Dropdown.Item key="undefined">Owned by anybody</Dropdown.Item>
							<Dropdown.Item key="true">Owned by me</Dropdown.Item>
							<Dropdown.Item key="false">Owned not by me</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
					<Spacer y={0.5} />
					<Dropdown>
						<Dropdown.Button flat auto>
							{filters.locked === undefined
								? "Locked status - off"
								: filters.locked
								? "Only locked"
								: "Only unlocked"}
						</Dropdown.Button>
						<Dropdown.Menu
							aria-label="Locked filter"
							disallowEmptySelection
							selectionMode="single"
							selectedKeys={new Set([String(filters.locked)])}
							onSelectionChange={onLockedFilterSelectionChange}
						>
							<Dropdown.Item key="undefined">Any locked status</Dropdown.Item>
							<Dropdown.Item key="true">Only locked</Dropdown.Item>
							<Dropdown.Item key="false">Only unlocked</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
				</Modal>
			</Grid.Container>
		</Wrapper>
	);
};
