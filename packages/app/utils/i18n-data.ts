import { keys } from "remeda";

import type { AssertAllEqual } from "#utils/types.ts";

import type adminEn from "../../../apps/web/public/locales/en/admin.json";
import type debtsEn from "../../../apps/web/public/locales/en/debts.json";
import type defaultEn from "../../../apps/web/public/locales/en/default.json";
import type emailEn from "../../../apps/web/public/locales/en/email.json";
import type loginEn from "../../../apps/web/public/locales/en/login.json";
import type peersEn from "../../../apps/web/public/locales/en/peers.json";
import type receiptsEn from "../../../apps/web/public/locales/en/receipts.json";
import type registerEn from "../../../apps/web/public/locales/en/register.json";
import type resetPasswordEn from "../../../apps/web/public/locales/en/reset-password.json";
import type settingsEn from "../../../apps/web/public/locales/en/settings.json";
// (*)
import type userEn from "../../../apps/web/public/locales/en/user.json";
import type voidUserEn from "../../../apps/web/public/locales/en/void-user.json";
import type adminRu from "../../../apps/web/public/locales/ru/admin.json";
import type debtsRu from "../../../apps/web/public/locales/ru/debts.json";
import type defaultRu from "../../../apps/web/public/locales/ru/default.json";
import type emailRu from "../../../apps/web/public/locales/ru/email.json";
import type loginRu from "../../../apps/web/public/locales/ru/login.json";
import type peersRu from "../../../apps/web/public/locales/ru/peers.json";
import type receiptsRu from "../../../apps/web/public/locales/ru/receipts.json";
import type registerRu from "../../../apps/web/public/locales/ru/register.json";
import type resetPasswordRu from "../../../apps/web/public/locales/ru/reset-password.json";
import type settingsRu from "../../../apps/web/public/locales/ru/settings.json";
import type userRu from "../../../apps/web/public/locales/ru/user.json";
import type voidUserRu from "../../../apps/web/public/locales/ru/void-user.json";

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
	"void-user": true,
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
	"void-user": typeof voidUserEn;
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
			"void-user": typeof voidUserRu;
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
