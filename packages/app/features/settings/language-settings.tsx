import React from "react";

import { useTranslation } from "react-i18next";
import { entries } from "remeda";

import { StoreDataContext } from "~app/contexts/store-data-context";
import type { Language } from "~app/utils/i18n-data";
import type { Locale } from "~app/utils/locale";
import { LANGUAGE_STORE_NAME } from "~app/utils/store/language";
import { LOCALE_STORE_NAME } from "~app/utils/store/locale";
import { Select } from "~components/select";
import { Text } from "~components/text";
import { View } from "~components/view";

const LANGUAGE_TEXT: Record<Language, string> = {
	en: "English",
	ru: "Русский",
};

const LANGUAGE_TO_LOCALE_MAP: Record<Language, Locale> = {
	en: "en-US",
	ru: "ru-RU",
};

export const LanguageSettings: React.FC = () => {
	const {
		[LOCALE_STORE_NAME]: [, setLocale],
		[LANGUAGE_STORE_NAME]: [, setLanguage],
	} = React.use(StoreDataContext);
	const { i18n, t } = useTranslation("settings");
	const currentLanguage = i18n.language as Language;
	const onChange = React.useCallback(
		(nextLanguage: Language) => {
			if (nextLanguage === currentLanguage) {
				return;
			}
			void i18n.changeLanguage(nextLanguage);
			setLanguage(nextLanguage);
			setLocale(LANGUAGE_TO_LOCALE_MAP[nextLanguage]);
		},
		[currentLanguage, i18n, setLocale, setLanguage],
	);
	return (
		<View className="flex-row items-center gap-4">
			<Text className="text-xl">{t("languages.header")}</Text>
			<Select
				testID="language-select"
				items={entries(LANGUAGE_TEXT).map(([language, text]) => ({
					language,
					text,
				}))}
				label={t("languages.dropdown.label")}
				placeholder={t("languages.dropdown.placeholder")}
				renderValue={(values) => values.map((value) => value.text).join(", ")}
				selectedKeys={[currentLanguage]}
				// oxlint-disable-next-line typescript/no-non-null-assertion
				onSelectionChange={(key) => onChange(key[0]!)}
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
