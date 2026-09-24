import type adminEn from "@ra/web/public/locales/en/admin.json";
import type debtsEn from "@ra/web/public/locales/en/debts.json";
import type defaultEn from "@ra/web/public/locales/en/default.json";
import type emailEn from "@ra/web/public/locales/en/email.json";
import type loginEn from "@ra/web/public/locales/en/login.json";
import type peersEn from "@ra/web/public/locales/en/peers.json";
import type receiptsEn from "@ra/web/public/locales/en/receipts.json";
import type registerEn from "@ra/web/public/locales/en/register.json";
import type resetPasswordEn from "@ra/web/public/locales/en/reset-password.json";
import type settingsEn from "@ra/web/public/locales/en/settings.json";
// (*)
import type userEn from "@ra/web/public/locales/en/user.json";
import type voidAccountEn from "@ra/web/public/locales/en/void-account.json";
import type adminRu from "@ra/web/public/locales/ru/admin.json";
import type debtsRu from "@ra/web/public/locales/ru/debts.json";
import type defaultRu from "@ra/web/public/locales/ru/default.json";
import type emailRu from "@ra/web/public/locales/ru/email.json";
import type loginRu from "@ra/web/public/locales/ru/login.json";
import type peersRu from "@ra/web/public/locales/ru/peers.json";
import type receiptsRu from "@ra/web/public/locales/ru/receipts.json";
import type registerRu from "@ra/web/public/locales/ru/register.json";
import type resetPasswordRu from "@ra/web/public/locales/ru/reset-password.json";
import type settingsRu from "@ra/web/public/locales/ru/settings.json";
import type userRu from "@ra/web/public/locales/ru/user.json";
import type voidAccountRu from "@ra/web/public/locales/ru/void-account.json";
import { keys } from "remeda";

import type { AssertAllEqual } from "~utils/types";

// To add a language add amespace jsons, import at (*) and verification at (**)
export type Language = "en" | "ru";
export const baseLanguage = "en";
export const languages: Record<Language, true> = {
	en: true,
	ru: true,
};

export const isLanguage = (input: string): input is Language =>
	keys(languages).includes(input as Language);

// To add a namespace add name in the list, namespace json, import at (*) and verification at (**)
export type Namespace = keyof Resources;
export const defaultNamespace: Namespace = "default";
export const namespaces: Record<Namespace, true> = {
	default: true,
	settings: true,
	user: true,
	admin: true,
	login: true,
	receipts: true,
	register: true,
	"reset-password": true,
	"void-account": true,
	peers: true,
	debts: true,
	email: true,
};

export type Resources = {
	default: typeof defaultEn;
	settings: typeof settingsEn;
	user: typeof userEn;
	admin: typeof adminEn;
	login: typeof loginEn;
	receipts: typeof receiptsEn;
	register: typeof registerEn;
	"reset-password": typeof resetPasswordEn;
	"void-account": typeof voidAccountEn;
	peers: typeof peersEn;
	debts: typeof debtsEn;
	email: typeof emailEn;
};

type ValidatedResources = AssertAllEqual<
	// (**)
	[
		Resources,
		{
			default: typeof defaultRu;
			settings: typeof settingsRu;
			user: typeof userRu;
			admin: typeof adminRu;
			login: typeof loginRu;
			receipts: typeof receiptsRu;
			register: typeof registerRu;
			"reset-password": typeof resetPasswordRu;
			"void-account": typeof voidAccountRu;
			peers: typeof peersRu;
			debts: typeof debtsRu;
			email: typeof emailRu;
		},
	]
>;

// Set to false if it's ok to have partial translations
type StrictTranslations = true;

declare module "i18next" {
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface CustomTypeOptions {
		defaultNS: "default";
		resources: StrictTranslations extends true
			? ValidatedResources extends never
				? never
				: Resources
			: Resources;
	}
}
