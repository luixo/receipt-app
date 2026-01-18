import React from "react";

import { useTranslation } from "react-i18next";
import { keys } from "remeda";

import { StoreDataContext } from "~app/contexts/store-data-context";
import type { Language } from "~app/utils/i18n-data";
import { LOCALE_STORE_NAME } from "~app/utils/store/locale";
import { Button } from "~components/button";
import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "~components/dropdown";
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
			<Dropdown>
				<DropdownTrigger>
					<Button variant="bordered">{LANGUAGE_TEXT[currentLanguage]}</Button>
				</DropdownTrigger>
				<DropdownMenu
					aria-label={t("languages.dropdownLabel")}
					onAction={(key) => onChange(key as Language)}
				>
					{keys(LANGUAGE_TEXT).map((language) => (
						<DropdownItem key={language} textValue={LANGUAGE_TEXT[language]}>
							<View
								className={
									language === currentLanguage ? "font-bold" : undefined
								}
							>
								<Text>{LANGUAGE_TEXT[language]}</Text>
							</View>
						</DropdownItem>
					))}
				</DropdownMenu>
			</Dropdown>
		</View>
	);
};
