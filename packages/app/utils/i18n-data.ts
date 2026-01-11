// (*)
import type accountEn from "@ra/web/public/locales/en/account.json";
import type adminEn from "@ra/web/public/locales/en/admin.json";
import type debtsEn from "@ra/web/public/locales/en/debts.json";
import type defaultEn from "@ra/web/public/locales/en/default.json";
import type loginEn from "@ra/web/public/locales/en/login.json";
import type receiptsEn from "@ra/web/public/locales/en/receipts.json";
import type registerEn from "@ra/web/public/locales/en/register.json";
import type resetPasswordEn from "@ra/web/public/locales/en/reset-password.json";
import type settingsEn from "@ra/web/public/locales/en/settings.json";
import type usersEn from "@ra/web/public/locales/en/users.json";
import type voidAccountEn from "@ra/web/public/locales/en/void-account.json";
import type accountRu from "@ra/web/public/locales/ru/account.json";
import type adminRu from "@ra/web/public/locales/ru/admin.json";
import type debtsRu from "@ra/web/public/locales/ru/debts.json";
import type defaultRu from "@ra/web/public/locales/ru/default.json";
import type loginRu from "@ra/web/public/locales/ru/login.json";
import type receiptsRu from "@ra/web/public/locales/ru/receipts.json";
import type registerRu from "@ra/web/public/locales/ru/register.json";
import type resetPasswordRu from "@ra/web/public/locales/ru/reset-password.json";
import type settingsRu from "@ra/web/public/locales/ru/settings.json";
import type usersRu from "@ra/web/public/locales/ru/users.json";
import type voidAccountRu from "@ra/web/public/locales/ru/void-account.json";
import { keys } from "remeda";

import type { AssertAllEqual } from "~utils/types";

// To add a language add code in the list, namespace jsons, import at (*) and verification at (**)
export type Language = "en" | "ru";
export const baseLanguage = "en";
export const languages: Record<Language, true> = {
	en: true,
	ru: true,
};

export const isLanguage = (input: string): input is Language =>
	keys(languages).includes(input as Language);

// To add a namespace add name in the list, namespace json, import at (*) and verification at (**)
export type Namespace =
	| "default"
	| "settings"
	| "account"
	| "admin"
	| "login"
	| "receipts"
	| "register"
	| "reset-password"
	| "void-account"
	| "users"
	| "debts";
export const defaultNamespace: Namespace = "default";
export const namespaces: Record<Namespace, true> = {
	default: true,
	settings: true,
	account: true,
	admin: true,
	login: true,
	receipts: true,
	register: true,
	"reset-password": true,
	"void-account": true,
	users: true,
	debts: true,
};

export type Resources = {
	default: typeof defaultEn;
	settings: typeof settingsEn;
	account: typeof accountEn;
	admin: typeof adminEn;
	login: typeof loginEn;
	receipts: typeof receiptsEn;
	register: typeof registerEn;
	"reset-password": typeof resetPasswordEn;
	"void-account": typeof voidAccountEn;
	users: typeof usersEn;
	debts: typeof debtsEn;
};

type ValidatedResources = AssertAllEqual<
	// (**)
	[
		Resources,
		{
			default: typeof defaultRu;
			settings: typeof settingsRu;
			account: typeof accountRu;
			admin: typeof adminRu;
			login: typeof loginRu;
			receipts: typeof receiptsRu;
			register: typeof registerRu;
			"reset-password": typeof resetPasswordRu;
			"void-account": typeof voidAccountRu;
			users: typeof usersRu;
			debts: typeof debtsRu;
		},
	]
>;

// Set to false if it's ok to have partial translations
type StrictTranslations = true;

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
