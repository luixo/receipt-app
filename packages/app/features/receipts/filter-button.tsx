import React from "react";

import type { Selection } from "@react-types/shared";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation("receipts");
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
		(filterKey: keyof typeof filters, selection: Selection) => {
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
							{sort === "date-desc"
								? t("list.sorting.newestFirst")
								: t("list.sorting.oldestFirst")}
						</Button>
						<Divider />
						<Text className="text-2xl font-medium">
							{t("list.filters.title")}
						</Text>
						<Dropdown>
							<DropdownTrigger>
								<Button
									color="primary"
									variant="flat"
									startContent={<ChevronDown />}
								>
									{filters.ownedByMe === undefined
										? t("list.filters.ownership.ownedByAnybody")
										: filters.ownedByMe
											? t("list.filters.ownership.ownedByMe")
											: t("list.filters.ownership.ownedByAnybodyButMe")}
								</Button>
							</DropdownTrigger>
							<DropdownMenu
								aria-label={t("list.filters.ownership.label")}
								disallowEmptySelection
								selectionMode="single"
								selectedKeys={new Set([String(filters.ownedByMe)])}
								onSelectionChange={onOwnedFilterSelectionChange}
							>
								<DropdownItem key="undefined">
									{t("list.filters.ownership.ownedByAnybody")}
								</DropdownItem>
								<DropdownItem key="true">
									{t("list.filters.ownership.ownedByMe")}
								</DropdownItem>
								<DropdownItem key="false">
									{t("list.filters.ownership.ownedNotByMe")}
								</DropdownItem>
							</DropdownMenu>
						</Dropdown>
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};
