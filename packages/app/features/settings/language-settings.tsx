import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { keys } from "remeda";

import type { Language } from "~app/utils/i18n";
import { Button } from "~components/button";
import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownTrigger,
} from "~components/dropdown";
import { Text } from "~components/text";

const LANGUAGE_TEXT: Record<Language, string> = {
	en: "English",
	ru: "Русский",
};

export const LanguageSettings: React.FC = () => {
	const { i18n, t } = useTranslation("settings");
	const currentLanguage = i18n.language as Language;
	const onChange = React.useCallback(
		(nextLanguage: Language) => {
			if (nextLanguage === currentLanguage) {
				return;
			}
			void i18n.changeLanguage(nextLanguage);
		},
		[currentLanguage, i18n],
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
							<div
								className={
									language === currentLanguage ? "font-bold" : undefined
								}
							>
								{LANGUAGE_TEXT[language]}
							</div>
						</DropdownItem>
					))}
				</DropdownMenu>
			</Dropdown>
		</View>
	);
};
