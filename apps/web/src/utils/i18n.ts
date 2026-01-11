/// <reference types="vite/client" />

import { parse } from "cookie";
import type { BackendModule, ParseKeys, ResourceKey } from "i18next";

import type { I18nContext } from "~app/utils/i18n";
import { baseLanguage, isLanguage } from "~app/utils/i18n-data";

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
				.toSorted((a, b) => b.q - a.q)
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
		try {
			if (import.meta.env.SSR) {
				const fs = await import("node:fs/promises");
				const url = await import("node:url");
				const publicPath = import.meta.env.DEV
					? `../../public`
					: process.env.VERCEL
						? "./static"
						: "../../public";
				const jsonUrl = new url.URL(
					`${publicPath}/locales/${language}/${namespace}.json`,
					import.meta.url,
				);
				const fileContent = await fs.readFile(url.fileURLToPath(jsonUrl));
				const resource = JSON.parse(fileContent.toString("utf8"));
				return resource as ResourceKey;
			}
			const response = await fetch(`/locales/${language}/${namespace}.json`);
			return await (response.json() as Promise<ResourceKey>);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(`Failed to load ${language}/${namespace} i18n translation`);
			throw e;
		}
	},
});

type TitleKey<T extends ParseKeys> = T extends `titles.${infer X}` ? X : never;
export const getTitle = (
	i18nContext: I18nContext,
	pageKey: TitleKey<ParseKeys>,
	params?: Record<string, unknown>,
) => {
	const t = i18nContext.getTranslation();
	return t("titles.template", { page: t(`titles.${pageKey}`, params) });
};
