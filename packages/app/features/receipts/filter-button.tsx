import React from "react";

import type { Selection } from "@react-types/shared/src/selection";

import type { Filters } from "~app/features/receipts/receipts-screen";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "~components/dropdown";
import {
	ChevronDown,
	FilterIcon,
	SortDownIcon,
	SortUpIcon,
} from "~components/icons";
import { Modal, ModalBody, ModalContent } from "~components/modal";
import { Text } from "~components/text";

type Props = {
	sortState: SearchParamState<"/receipts", "sort">;
	filtersState: SearchParamState<"/receipts", "filters">;
};

export const FilterButton: React.FC<Props> = ({
	sortState: [sort, setSort],
	filtersState: [filters, setFilters],
}) => {
	const [filterModalOpen, { switchValue: switchFilterModal }] =
		useBooleanState(false);

	const sortSelectOnPress = React.useCallback(
		() =>
			setSort((prevSort) =>
				prevSort === "date-desc" ? "date-asc" : "date-desc",
			),
		[setSort],
	);
	const SortIcon = sort === "date-desc" ? SortDownIcon : SortUpIcon;

	const onFilterSelectionChange = React.useCallback(
		(filterKey: keyof Filters, selection: Selection) => {
			if (selection === "all") {
				return;
			}
			const key = [...selection.values()][0];
			switch (key) {
				case "true":
					void setFilters((prev) => ({ ...prev, [filterKey]: true }));
					break;
				case "false":
					void setFilters((prev) => ({ ...prev, [filterKey]: false }));
					break;
				default:
					void setFilters((prev) => ({ ...prev, [filterKey]: undefined }));
			}
		},
		[setFilters],
	);
	const onOwnedFilterSelectionChange = React.useCallback(
		(selection: Selection) => onFilterSelectionChange("ownedByMe", selection),
		[onFilterSelectionChange],
	);

	return (
		<>
			<Button color="primary" isIconOnly onPress={switchFilterModal}>
				<FilterIcon size={24} />
			</Button>
			<Modal isOpen={filterModalOpen} onOpenChange={switchFilterModal}>
				<ModalContent>
					<ModalBody className="items-center">
						<Button variant="light" onPress={sortSelectOnPress}>
							<SortIcon size={24} />
							{sort === "date-desc" ? "Newest first" : "Oldest first"}
						</Button>
						<Divider />
						<Text className="text-2xl font-medium">Filters</Text>
						<Dropdown>
							<DropdownTrigger>
								<Button
									color="primary"
									variant="flat"
									startContent={<ChevronDown />}
								>
									{filters.ownedByMe === undefined
										? "Owned by anybody"
										: filters.ownedByMe
										? "Owned by me"
										: "Owned by anybody but me"}
								</Button>
							</DropdownTrigger>
							<DropdownMenu
								aria-label="Owned by me filter"
								disallowEmptySelection
								selectionMode="single"
								selectedKeys={new Set([String(filters.ownedByMe)])}
								onSelectionChange={onOwnedFilterSelectionChange}
							>
								<DropdownItem key="undefined">Owned by anybody</DropdownItem>
								<DropdownItem key="true">Owned by me</DropdownItem>
								<DropdownItem key="false">Owned not by me</DropdownItem>
							</DropdownMenu>
						</Dropdown>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
