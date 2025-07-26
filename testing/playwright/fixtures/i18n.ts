import { test } from "@playwright/test";
import fs from "node:fs/promises";
import url from "node:url";

import { COOKIE_LANGUAGE_NAME } from "~app/utils/i18n";
import {
	type Language,
	type Namespace,
	type Resources,
	baseLanguage,
} from "~app/utils/i18n-data";

type Fixtures = {
	setLanguageCookie: (language: Language) => Promise<void>;
	getLanguages: () => Promise<Language[]>;
	getNamespaces: (language?: Language) => Promise<Namespace[]>;
	getI18nResource: <N extends Namespace>(
		language: Language,
		namespace: N,
	) => Promise<Resources[N]>;
};

export const i18nFixtures = test.extend<Fixtures>({
	setLanguageCookie: async ({ page, baseURL }, use) => {
		await use(async (language) => {
			await page.context().addCookies([
				{
					name: COOKIE_LANGUAGE_NAME,
					value: language,
					url: baseURL,
				},
			]);
		});
	},
	getLanguages: async ({ page }, use) => {
		await use(async () => {
			const languages = await page.evaluate(() => {
				if (!window.i18n) {
					throw new Error("Expected to have i18n in window");
				}
				// eslint-disable-next-line no-restricted-syntax
				return Object.keys(window.i18n.store.data) as Language[];
			}, []);
			return languages;
		});
	},
	getNamespaces: async ({ page }, use) => {
		await use(async (overrideLanguage) => {
			const language = overrideLanguage || baseLanguage;
			const namespaces = await page.evaluate(
				([languageInner]) => {
					if (!window.i18n) {
						throw new Error("Expected to have i18n in window");
					}
					// eslint-disable-next-line no-restricted-syntax
					return Object.keys(
						window.i18n.store.data[languageInner] ?? {},
					) as Namespace[];
				},
				[language] as const,
			);
			return namespaces;
		});
	},
	getI18nResource: async ({}, use) => {
		await use(async (language, namespace) => {
			const resource = await fs.readFile(
				url.fileURLToPath(
					new URL(
						`../../../apps/web/public/locales/${language}/${namespace}.json`,
						import.meta.url,
					).toString(),
				),
			);
			return JSON.parse(
				resource.toString("utf8"),
			) as Resources[typeof namespace];
		});
	},
});
