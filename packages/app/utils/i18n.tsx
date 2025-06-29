/// <reference types="vite/client" />
import React from "react";

// (*)
import type defaultEn from "@ra/web/public/locales/en/default.json";
import type settingsEn from "@ra/web/public/locales/en/settings.json";
import type defaultRu from "@ra/web/public/locales/ru/default.json";
import type settingsRu from "@ra/web/public/locales/ru/settings.json";
import { parse } from "cookie";
import type {
	BackendModule,
	InitOptions,
	Resource,
	ResourceKey,
	i18n,
} from "i18next";
import { I18nContext } from "react-i18next";
import { keys } from "remeda";

import type { AssertAllEqual } from "~utils/types";

// To add a language add code in the list, namespace jsons, import at (*) and verification at (**)
export type Language = "en" | "ru";
export const baseLanguage = "en";
export const languages: Record<Language, true> = {
	en: true,
	ru: true,
};

const isLanguage = (input: string): input is Language =>
	keys(languages).includes(input as Language);

// To add a namespace add name in the list, namespace json, import at (*) and verification at (**)
export type Namespace = "default" | "settings";
export const defaultNamespace: Namespace = "default";
export const namespaces: Record<Namespace, true> = {
	default: true,
	settings: true,
};

export const i18nInitOptions: InitOptions = {
	fallbackLng: baseLanguage,
	defaultNS: defaultNamespace,
	ns: [defaultNamespace],
	supportedLngs: keys(languages),
	interpolation: {
		// React doesn't need to escape values
		escapeValue: false,
	},
	partialBundledLanguages: true,
};

export const useInitializeI18n = (language: Language, store: Resource) => {
	const { i18n } = React.useContext(I18nContext);
	// SSR should be already initialized at the moment
	if (!i18n.isInitialized && !i18n.isInitializing) {
		void i18n.init({
			lng: language,
			resources: store,
		});
	}
};

const getCookie = (request: Request | null) =>
	request ? (request.headers.get("cookie") ?? "") : document.cookie;

const getHeaderLanguages = (request: Request | null) =>
	request
		? (request.headers.get("accept-language") ?? "")
				.split(",")
				.map((lang) => {
					const [tag = "", q = "1"] = lang.trim().split(";q=");
					return {
						fullTag: tag.toLowerCase(),
						baseTag: tag.split("-")[0]?.toLowerCase() || "",
						q: Number(q),
					};
				})
				.sort((a, b) => b.q - a.q)
				.flatMap(({ fullTag, baseTag }) => [fullTag, baseTag])
		: // eslint-disable-next-line n/no-unsupported-features/node-builtins
			window.navigator.languages;

type Strategy = "cookie" | "header" | "baseLocale";
const strategies: Strategy[] = ["cookie", "header", "baseLocale"];
export const COOKIE_LANGUAGE_NAME = "receipt_language";
export const getLanguageFromRequest = (request: Request | null) => {
	for (const strategy of strategies) {
		switch (strategy) {
			case "cookie": {
				const cookies = parse(getCookie(request));
				const cookieLanguage = cookies[COOKIE_LANGUAGE_NAME] ?? "";
				if (isLanguage(cookieLanguage)) {
					return cookieLanguage;
				}
				break;
			}
			case "header": {
				const headerLanguages = getHeaderLanguages(request);
				for (const headerLanguage of headerLanguages) {
					if (isLanguage(headerLanguage)) {
						return headerLanguage;
					}
				}
				break;
			}
			case "baseLocale": {
				return baseLanguage;
			}
		}
	}
	return baseLanguage;
};

export const getBackendModule = (): BackendModule => ({
	type: "backend",
	init: () => {},
	// Improper types in i18next
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	read: async (language, namespace) => {
		if (import.meta.env.SSR) {
			const fs = await import("node:fs/promises");
			const url = await import("node:url");
			const rootPath = import.meta.env.DEV ? `../../../apps/web` : `..`;
			const jsonUrl = new url.URL(
				`${rootPath}/public/locales/${language}/${namespace}.json`,
				import.meta.url,
			);

			const resource = JSON.parse(
				(await fs.readFile(url.fileURLToPath(jsonUrl))).toString("utf-8"),
			);
			return resource as ResourceKey;
		}
		const response = await fetch(`/locales/${language}/${namespace}.json`);
		return response.json() as Promise<ResourceKey>;
	},
});

export const getServerSideT = (ctx: {
	i18n: i18n;
	initialLanguage: Language;
}) => ctx.i18n.getFixedT(ctx.initialLanguage, "default");

export const ensureI18nInitialized = async (ctx: {
	i18n: i18n;
	initialLanguage: Language;
}): Promise<void> => {
	if (ctx.i18n.isInitialized) {
		return;
	}
	if (ctx.i18n.isInitializing) {
		return new Promise((resolve) => {
			ctx.i18n.on("initialized", () => resolve());
		});
	}
	await ctx.i18n.init({ lng: ctx.initialLanguage });
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
