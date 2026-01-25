import type React from "react";

import { useTranslation } from "react-i18next";
import DatePicker from "react-native-date-picker";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { Input } from "~components/input";
import { getMutationLoading } from "~components/utils";
import { fromDate, getNow, localTimeZone, parsers } from "~utils/date";

import type { Props } from "./date-input";

export const DateInput: React.FC<Props> = ({
	value,
	onValueChange,
	mutation,
	label,
	...props
}) => {
	const { t } = useTranslation("default");
	const locale = useLocale();
	const { formatPlainDate } = useFormat();
	const [open, { setTrue: setOpen, setFalse: setClose }] =
		useBooleanState(false);
	const isDisabled = getMutationLoading(mutation);
	return (
		<>
			<Input
				value={
					value ? formatPlainDate(value) : t("components.dateInput.placeholder")
				}
				onValueChange={(nextValue) => {
					// Manual update - or by automation tool
					onValueChange(
						parsers.plainDate(
							nextValue as Parameters<typeof parsers.plainDate>[0],
						),
					);
				}}
				isReadOnly={import.meta.env.MODE !== "test"}
				label={label || t("components.dateInput.label")}
				mutation={mutation}
				type="text"
				onPress={isDisabled ? undefined : setOpen}
				inputClassName={value && !isDisabled ? undefined : "opacity-50"}
				{...props}
			/>
			<DatePicker
				modal
				open={open}
				mode="date"
				date={(value || getNow.plainDate()).toDate(localTimeZone)}
				locale={locale}
				onConfirm={(date) => {
					setClose();
					onValueChange(fromDate.plainDate(date));
				}}
				onCancel={setClose}
				title={label || t("components.dateInput.label")}
				confirmText={t("components.dateInput.confirmText")}
				cancelText={t("components.dateInput.cancelText")}
			/>
		</>
	);
};
