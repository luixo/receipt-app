import type { PropsWithChildren } from "react";

import { isServer } from "@tanstack/react-query";
import { createInstance } from "i18next";
import type {
	i18n as I18n,
	InitOptions,
	PostProcessorModule,
	Resource,
} from "i18next";
import { I18nextProvider } from "react-i18next";
import { capitalize, clone, keys, unique } from "remeda";
import z from "zod";

import type { TRPCError } from "#app/trpc.ts";
import { promisifyEvent } from "#utils/promise.ts";

import type { Language, Namespace } from "./i18n-data";
import { baseLanguage, defaultNamespace, languages } from "./i18n-data";

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

export const validatorLocales: Record<
	Language,
	// oxlint-disable-next-line typescript/consistent-type-imports
	() => Promise<typeof import("zod/v4/locales/en.js")>
> = {
	en: () => import("zod/v4/locales/en.js"),
	ru: () => import("zod/v4/locales/ru.js"),
};

const translateValidatorMessage = ({
	instance,
	key,
	params: { target, ...rest },
	language,
}: {
	instance: I18n;
	key: string;
	params: Record<string, unknown>;
	language: Language;
}) =>
	instance.t(key, {
		...rest,
		target:
			typeof target === "string"
				? instance.t(target, { lng: language, defaultValue: target })
				: target,
		lng: language,
		defaultValue: key,
	});

export const getValidatorMessageFactory =
	(instance: I18n, language: Language) =>
	(issue: { code: string; params?: Record<string, unknown> }) => {
		const { i18nKey, ...params } = issue.params ?? {};
		if (typeof i18nKey !== "string") {
			return;
		}
		if (instance.exists(i18nKey, { lng: language })) {
			return capitalize(
				translateValidatorMessage({ instance, key: i18nKey, params, language }),
			);
		}
		if (instance.exists(i18nKey, { lng: baseLanguage })) {
			return translateValidatorMessage({
				instance,
				key: i18nKey,
				params,
				language: baseLanguage,
			});
		}
	};

export const changeValidatorLocale = async (
	language: Language,
	instance: I18n,
) => {
	if (isServer) {
		throw new Error(`Expected to call "changeValidatorLocale" only on client`);
	}
	const { default: locale } = await validatorLocales[language]();
	z.config({
		...locale(),
		customError: getValidatorMessageFactory(instance, language),
	});
};

const addFormatters = (instance: I18n) => {
	instance.use({
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
	} satisfies PostProcessorModule);
	/* oxlint-disable typescript/no-non-null-assertion */
	instance.services.formatter!.add("and", (messages: string[]) => {
		if (messages.length === 1) {
			return messages.join("");
		}
		const t = instance.getFixedT(instance.language);
		return [messages.slice(0, -1).join(", "), ...messages.slice(-1)].join(
			t("common.andJoiner"),
		);
	});
	instance.services.formatter!.add("uniqueErrors", (errors: TRPCError[]) =>
		unique(errors.map((error) => error.message)).join("\n"),
	);
	instance.services.formatter!.add(
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
	/* oxlint-enable typescript/no-non-null-assertion */
};

const id = <T,>(a: T): T => a;

/*
  i18n flow

  Server:
  - instance is created on server (with fixed lng & loaded resources)
  - server provides instance via `Provider`
  
  Client:
  - instance lng & resources are dehydrated to client via `serializeContext`
  - client hydrates them via `onHydrate`
  - client provides hydrated instance via `Provider`
*/
export const createI18nContext = ({
	getLanguage,
	beforeInit = id,
	isInitializable,
}: {
	getLanguage: () => Language;
	beforeInit?: (instance: I18n) => I18n;
	isInitializable?: boolean;
}) => {
	const initialLanguage = getLanguage();
	const instance = beforeInit(
		// Options are cloned because i18next mutates properties inline
		// causing different request to get same e.g. namespaces
		createInstance(clone(i18nInitOptions)),
	);
	const ensureInitialized = () => {
		if (instance.isInitialized) {
			return;
		}
		if (instance.isInitializing) {
			return promisifyEvent((listener) => {
				instance.on("initialized", listener);
				return () => instance.off("initialized", listener);
			});
		}
		if (isInitializable) {
			return instance.init({ lng: initialLanguage }, () =>
				addFormatters(instance),
			);
		}
		// This is a log we should see on client in case instance was not initialized
		// oxlint-disable-next-line no-console
		console.error(
			`Expected to be in either pending or resolved initialized state`,
		);
	};
	return {
		instance,
		serializeContext: () => ({
			language: instance.language as Language,
			data: instance.store.data,
		}),
		initialize: async (
			serializedData: Partial<{ language: Language; data: Resource }>,
		) => {
			await instance.init({
				lng: serializedData.language,
				resources: serializedData.data,
			});
			if (!isServer) {
				await changeValidatorLocale(
					serializedData.language ?? initialLanguage,
					instance,
				);
			}
			addFormatters(instance);
		},
		Provider: ({ children }: PropsWithChildren) => (
			<I18nextProvider i18n={instance}>{children}</I18nextProvider>
		),
		loadNamespaces: async (...namespaces: Namespace[]) => {
			await ensureInitialized();
			return instance.loadNamespaces(["default", ...namespaces]);
		},
		getTranslation: () => instance.getFixedT(initialLanguage),
		getNamespacedTranslation: <N extends Namespace>(namespace: N) =>
			instance.getFixedT(initialLanguage, namespace),
	};
};

export type I18nContext = ReturnType<typeof createI18nContext>;
