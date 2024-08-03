import React from "react";

import type { Selection } from "@react-types/shared/src/selection";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import {
	Button,
	Divider,
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
	Modal,
	ModalBody,
	ModalContent,
	Text,
} from "~components";
import {
	ChevronDown,
	FilterIcon,
	SortDownIcon,
	SortUpIcon,
} from "~components/icons";
import * as queries from "~queries";

export const FilterButton: React.FC = () => {
	const [{ orderBy, filters = {} }, { changeOrderBy, changeFilters }] =
		queries.receipts.getPaged.useStore();

	const [filterModalOpen, { switchValue: switchFilterModal }] =
		useBooleanState(false);

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
		<>
			<Button color="primary" isIconOnly onClick={switchFilterModal}>
				<FilterIcon size={24} />
			</Button>
			<Modal isOpen={filterModalOpen} onOpenChange={switchFilterModal}>
				<ModalContent>
					<ModalBody className="items-center">
						<Button variant="light" onClick={sortSelectOnClick}>
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
									{filters.resolvedByMe === undefined
										? "Any resolved by me status"
										: filters.resolvedByMe
										? "Only resolved by me"
										: "Only non-resolved by me"}
								</Button>
							</DropdownTrigger>
							<DropdownMenu
								aria-label="Resolved by me filter"
								disallowEmptySelection
								selectionMode="single"
								selectedKeys={new Set([String(filters.resolvedByMe)])}
								onSelectionChange={onResolvedFilterSelectionChange}
							>
								<DropdownItem key="undefined">
									Any resolved by me status
								</DropdownItem>
								<DropdownItem key="true">Only resolved</DropdownItem>
								<DropdownItem key="false">Only non-resolved</DropdownItem>
							</DropdownMenu>
						</Dropdown>
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
						<Dropdown>
							<DropdownTrigger>
								<Button
									color="primary"
									variant="flat"
									startContent={<ChevronDown />}
								>
									{filters.locked === undefined
										? "Locked status - off"
										: filters.locked
										? "Only locked"
										: "Only unlocked"}
								</Button>
							</DropdownTrigger>
							<DropdownMenu
								aria-label="Locked filter"
								disallowEmptySelection
								selectionMode="single"
								selectedKeys={new Set([String(filters.locked)])}
								onSelectionChange={onLockedFilterSelectionChange}
							>
								<DropdownItem key="undefined">Any locked status</DropdownItem>
								<DropdownItem key="true">Only locked</DropdownItem>
								<DropdownItem key="false">Only unlocked</DropdownItem>
							</DropdownMenu>
						</Dropdown>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
