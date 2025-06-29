// (*)
import type defaultEn from "@ra/web/public/locales/en/default.json";
import type settingsEn from "@ra/web/public/locales/en/settings.json";
import type defaultRu from "@ra/web/public/locales/ru/default.json";
import type settingsRu from "@ra/web/public/locales/ru/settings.json";

import type { AssertAllEqual } from "~utils/types";

// To add a language add code in the list, namespace jsons, import at (*) and verification at (**)
export type Language = "en" | "ru";
export const baseLanguage = "en";
export const languages: Record<Language, true> = {
	en: true,
	ru: true,
};

// To add a namespace add name in the list, namespace json, import at (*) and verification at (**)
export type Namespace = "default" | "settings";
export const defaultNamespace: Namespace = "default";
export const namespaces: Record<Namespace, true> = {
	default: true,
	settings: true,
};

export type Resources = {
	default: typeof defaultEn;
	settings: typeof settingsEn;
};

type ValidatedResources = AssertAllEqual<
	// (**)
	[Resources, { default: typeof defaultRu; settings: typeof settingsRu }]
>;

// Set to true when ready to translate all translations in the same time
type StrictTranslations = false;

declare module "i18next" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface CustomTypeOptions {
		defaultNS: "default";
		resources: StrictTranslations extends true
			? ValidatedResources extends never
				? never
				: Resources
			: Resources;
	}
}
