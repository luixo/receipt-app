import React from "react";

import { Calendar } from "@heroui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { useTranslation } from "react-i18next";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormat } from "~app/hooks/use-format";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import type { MutationsProp } from "~components/utils";
import { getMutationLoading } from "~components/utils";
import { View } from "~components/view";
import { type Temporal, parsers } from "~utils/date";

type Props = {
	value: Temporal.PlainDate | undefined;
	onValueChange: (date: Temporal.PlainDate) => void;
	mutation?: MutationsProp;
	label?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onValueChange">;

export const DateInput: React.FC<Props> = ({
	value,
	onValueChange,
	mutation,
	label,
	...props
}) => {
	const { t } = useTranslation("default");
	const { formatPlainDate } = useFormat();
	const [open, { switchValue: switchOpen, setFalse: setClose }] =
		useBooleanState(false);
	const isDisabled = getMutationLoading(mutation);
	return (
		<Popover
			isOpen={open}
			onOpenChange={switchOpen}
			isTriggerDisabled={isDisabled}
		>
			<PopoverTrigger>
				<div>
					<Input
						value={value ? formatPlainDate(value) : ""}
						onValueChange={(nextValue) => {
							// Manual update - or by automation tool
							onValueChange(
								parsers.plainDate(
									nextValue as Parameters<typeof parsers.plainDate>[0],
								),
							);
						}}
						isReadOnly
						label={label || t("components.dateInput.label")}
						mutation={mutation}
						type="text"
						{...props}
					/>
				</div>
			</PopoverTrigger>
			<PopoverContent className="border-foreground border-2 p-0 shadow-md">
				<Calendar<Temporal.PlainDate>
					onChange={(nextValue) => {
						onValueChange(nextValue);
						setClose();
					}}
					showMonthAndYearPickers
					value={value}
					isDisabled={isDisabled}
				/>
			</PopoverContent>
		</Popover>
	);
};

export const SkeletonDateInput: React.FC<
	{ label?: string } & React.ComponentProps<typeof Input>
> = ({ label, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<View>
			<SkeletonInput
				skeletonClassName="w-32"
				label={label || t("components.dateInput.label")}
				{...props}
			/>
		</View>
	);
};
