/// <reference types="vite/client" />

import { parse } from "cookie";
import type { BackendModule, InitOptions, ResourceKey, i18n } from "i18next";
import { keys } from "remeda";

import type { Language, Namespace } from "./i18n-data";
import { baseLanguage, defaultNamespace, languages } from "./i18n-data";

const isLanguage = (input: string): input is Language =>
	keys(languages).includes(input as Language);

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
		try {
			if (import.meta.env.SSR) {
				const fs = await import("node:fs/promises");
				const url = await import("node:url");
				const publicPath = import.meta.env.DEV
					? `../../../apps/web/public`
					: process.env.VERCEL
						? "./static"
						: "../../public";
				const jsonUrl = new url.URL(
					`${publicPath}/locales/${language}/${namespace}.json`,
					import.meta.url,
				);

				const resource = JSON.parse(
					(await fs.readFile(url.fileURLToPath(jsonUrl))).toString("utf-8"),
				);
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

export const getServerSideT = (ctx: {
	i18n: i18n;
	initialLanguage: Language;
}) => ctx.i18n.getFixedT(ctx.initialLanguage, "default");

const ensureI18nInitialized = async (ctx: {
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

export const loadNamespaces = async (
	ctx: {
		i18n: i18n;
		initialLanguage: Language;
	},
	namespaces: Namespace | Namespace[],
): Promise<void> => {
	await ensureI18nInitialized(ctx);
	await ctx.i18n.loadNamespaces(namespaces);
};
