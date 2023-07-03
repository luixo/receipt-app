import React from "react";

import { z } from "zod";

import { fallback } from "app/utils/validation";

export const SETTINGS_COOKIE_NAME = "receipt_settings";

const settingsSchema = z.object({
	showResolvedDebts: fallback(z.boolean(), false),
});

export type Settings = z.infer<typeof settingsSchema>;

type SettingsContextType = [
	Settings,
	React.Dispatch<React.SetStateAction<Settings>>
];

export const defaultSettings: Settings = { showResolvedDebts: false };

export const validateSettings = (input: unknown): Settings => {
	try {
		return fallback(settingsSchema, defaultSettings).parse(
			typeof input === "string" ? JSON.parse(input) : input
		);
	} catch (e) {
		return defaultSettings;
	}
};

export const SettingsContext = React.createContext<SettingsContextType>([
	defaultSettings,
	() => {},
]);
