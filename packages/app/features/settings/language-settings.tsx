import React from "react";

import { useTranslation } from "react-i18next";
import { entries } from "remeda";

import { StoreDataContext } from "~app/contexts/store-data-context";
import type { Language } from "~app/utils/i18n-data";
import { LOCALE_STORE_NAME } from "~app/utils/store/locale";
import { Select } from "~components/select";
import { Text } from "~components/text";
import { View } from "~components/view";

const LANGUAGE_TEXT: Record<Language, string> = {
	en: "English",
	ru: "Русский",
};

export const LanguageSettings: React.FC = () => {
	const {
		[LOCALE_STORE_NAME]: [, setLocale],
	} = React.use(StoreDataContext);
	const { i18n, t } = useTranslation("settings");
	const currentLanguage = i18n.language as Language;
	const onChange = React.useCallback(
		(nextLanguage: Language) => {
			if (nextLanguage === currentLanguage) {
				return;
			}
			void i18n.changeLanguage(nextLanguage);
			setLocale(nextLanguage);
		},
		[currentLanguage, i18n, setLocale],
	);
	return (
		<View className="flex-row items-center gap-4">
			<Text className="text-xl">{t("languages.header")}</Text>
			<Select
				items={entries(LANGUAGE_TEXT).map(([language, text]) => ({
					language,
					text,
				}))}
				label={t("languages.dropdown.label")}
				placeholder={t("languages.dropdown.placeholder")}
				renderValue={(values) => values.map((value) => value.text).join(", ")}
				selectedKeys={[currentLanguage]}
				onSelectionChange={(key) => onChange(key[0] as Language)}
				getKey={({ language }) => language}
			>
				{({ language, text }) => (
					<Text
						className={language === currentLanguage ? "font-bold" : undefined}
					>
						{text}
					</Text>
				)}
			</Select>
		</View>
	);
};
