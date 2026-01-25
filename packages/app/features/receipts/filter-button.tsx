import React from "react";

import { useTranslation } from "react-i18next";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { SearchParamState } from "~app/utils/navigation";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Icon } from "~components/icons";
import { Modal } from "~components/modal";
import { Select } from "~components/select";
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
	const sortIconName = sort === "date-desc" ? "sort-down" : "sort-up";
	const filterOwnerOptions: Record<"true" | "false" | "undefined", string> = {
		undefined: t("list.filters.ownership.ownedByAnybody"),
		true: t("list.filters.ownership.ownedByMe"),
		false: t("list.filters.ownership.ownedNotByMe"),
	};

	const onFilterSelectionChange = React.useCallback(
		(filterKey: keyof typeof filters, key: keyof typeof filterOwnerOptions) => {
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
		(selection: keyof typeof filterOwnerOptions) =>
			onFilterSelectionChange("ownedByMe", selection),
		[onFilterSelectionChange],
	);

	return (
		<>
			<Button color="primary" isIconOnly onPress={switchFilterModal}>
				<Icon name="filter" className="size-6" />
			</Button>
			<Modal
				isOpen={filterModalOpen}
				onOpenChange={switchFilterModal}
				bodyClassName="items-center"
			>
				<Button variant="light" onPress={sortSelectOnPress}>
					<Icon name={sortIconName} className="size-6" />
					{sort === "date-desc"
						? t("list.sorting.newestFirst")
						: t("list.sorting.oldestFirst")}
				</Button>
				<Divider />
				<Text className="text-2xl font-medium">{t("list.filters.title")}</Text>
				<Select
					items={(["true", "false", "undefined"] as const).map((position) => ({
						position,
					}))}
					label={t("list.filters.ownership.label")}
					placeholder=""
					renderValue={(values) =>
						values.map(({ position }) => (
							<Text key={position}>{filterOwnerOptions[position]}</Text>
						))
					}
					selectedKeys={[
						filters.ownedByMe === undefined
							? "undefined"
							: filters.ownedByMe
								? "true"
								: "false",
					]}
					onSelectionChange={(nextKeys) => {
						if (!nextKeys[0]) {
							return;
						}
						onOwnedFilterSelectionChange(nextKeys[0]);
					}}
					disallowEmptySelection
					getKey={({ position }) => position}
				>
					{({ position }) => <Text>{filterOwnerOptions[position]}</Text>}
				</Select>
			</Modal>
		</>
	);
};
