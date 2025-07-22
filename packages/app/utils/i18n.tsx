/// <reference types="vite/client" />

import { parse } from "cookie";
import type {
	BackendModule,
	InitOptions,
	ParseKeys,
	PostProcessorModule,
	Resource,
	ResourceKey,
	i18n,
} from "i18next";
import { capitalize, keys, unique } from "remeda";

import type { TRPCError } from "~app/trpc";

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
	postProcess: "capitalize",
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

export const getServerSideT = (
	ctx: {
		i18n: i18n;
		initialLanguage: Language;
	},
	namespace: Namespace,
) => ctx.i18n.getFixedT(ctx.initialLanguage, namespace);

type TitleKey<T extends ParseKeys> = T extends `titles.${infer X}` ? X : never;
export const getTitle = (
	ctx: Parameters<typeof getServerSideT>[0],
	pageKey: TitleKey<ParseKeys>,
	params?: Record<string, unknown>,
) => {
	const t = getServerSideT(ctx, "default");
	return t("titles.template", { page: t(`titles.${pageKey}`, params) });
};

export const ensureI18nInitialized = async (ctx: {
	i18n: i18n;
	initialLanguage: Language;
	resources?: Resource;
}): Promise<void> => {
	if (ctx.i18n.isInitialized) {
		return;
	}
	if (ctx.i18n.isInitializing) {
		return new Promise((resolve) => {
			ctx.i18n.on("initialized", () => resolve());
		});
	}
	await ctx.i18n
		.use({
			type: "postProcessor",
			name: "capitalize",
			process: (value, key) => {
				const arrayKey = Array.isArray(key) ? key : [key];
				const firstKey = arrayKey[0] || "";
				if (
					firstKey.startsWith("toasts") &&
					["success", "error", "mutate"].some((suffix) =>
						firstKey.endsWith(suffix),
					)
				) {
					// We should always capitalize toast messages
					return capitalize(value);
				}
				return value;
			},
		} satisfies PostProcessorModule)
		.init({ lng: ctx.initialLanguage, resources: ctx.resources });
	/* eslint-disable @typescript-eslint/no-non-null-assertion */
	ctx.i18n.services.formatter!.add("and", (messages: string[]) => {
		if (messages.length === 1) {
			return messages.join("");
		}
		const t = ctx.i18n.getFixedT(ctx.i18n.language);
		return [messages.slice(0, -1).join(", "), ...messages.slice(-1)].join(
			t("common.andJoiner"),
		);
	});
	ctx.i18n.services.formatter!.add("uniqueErrors", (errors: TRPCError[]) =>
		unique(errors.map((error) => error.message)).join("\n"),
	);
	ctx.i18n.services.formatter!.add(
		// Inline plural format
		// Translation: `{ "foo": "Creating {{countVar, plural(one:item;other:{count} items)}}" }`
		// Resolves `t("foo", {countVar: 3})` to `Creating 3 items`
		"plural",
		(
			value: number,
			lng: string | undefined,
			options: Record<Intl.LDMLPluralRule, string>,
		) => {
			const pluralRules = new Intl.PluralRules(lng || baseLanguage);
			const result = pluralRules.select(value);
			return (options[result] || options.other).replace(
				"{count}",
				value.toString(),
			);
		},
	);
	/* eslint-enable @typescript-eslint/no-non-null-assertion */
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
