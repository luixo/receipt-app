import React from "react";

import type { Selection } from "@react-types/shared/src/selection";

import { useBooleanState } from "~app/hooks/use-boolean-state";
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
import { useStore as useReceiptsGetPagedStore } from "~queries/receipts/get-paged";

export const FilterButton: React.FC = () => {
	const [{ orderBy, filters = {} }, { changeOrderBy, changeFilters }] =
		useReceiptsGetPagedStore();

	const [filterModalOpen, { switchValue: switchFilterModal }] =
		useBooleanState(false);

	const sortSelectOnPress = React.useCallback(
		() => changeOrderBy(orderBy === "date-desc" ? "date-asc" : "date-desc"),
		[changeOrderBy, orderBy],
	);
	const SortIcon = orderBy === "date-desc" ? SortDownIcon : SortUpIcon;

	const onFilterSelectionChange = React.useCallback(
		(filterKey: keyof typeof filters, selection: Selection) => {
			if (selection === "all") {
				return;
			}
			const key = [...selection.values()][0];
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
							{orderBy === "date-desc" ? "Newest first" : "Oldest first"}
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
