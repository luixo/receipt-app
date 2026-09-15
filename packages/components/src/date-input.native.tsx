import type React from "react";

import { useTranslation } from "react-i18next";
import DatePicker from "react-native-date-picker";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { Input } from "~components/input";
import { getMutationLoading } from "~components/utils";

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
					onValueChange(Temporal.PlainDate.from(nextValue));
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
				date={
					// oxlint-disable-next-line eslint-js/no-restricted-syntax
					new Date(
						(value || Temporal.Now.plainDateISO())
							.toPlainDateTime(Temporal.PlainTime.from("00:00"))
							.toZonedDateTime(Temporal.Now.timeZoneId())
							.toInstant().epochMilliseconds,
					)
				}
				locale={locale}
				onConfirm={(date) => {
					setClose();
					onValueChange(
						Temporal.Instant.fromEpochMilliseconds(date.getTime())
							.toZonedDateTimeISO(Temporal.Now.timeZoneId())
							.toPlainDate(),
					);
				}}
				onCancel={setClose}
				title={label || t("components.dateInput.label")}
				confirmText={t("components.dateInput.confirmText")}
				cancelText={t("components.dateInput.cancelText")}
			/>
		</>
	);
};
