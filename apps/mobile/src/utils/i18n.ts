import type { Language, Namespace } from "#app/utils/i18n-data.ts";

import adminEn from "../../../web/public/locales/en/admin.json";
import debtsEn from "../../../web/public/locales/en/debts.json";
import defaultEn from "../../../web/public/locales/en/default.json";
import emailEn from "../../../web/public/locales/en/email.json";
import loginEn from "../../../web/public/locales/en/login.json";
import peersEn from "../../../web/public/locales/en/peers.json";
import receiptsEn from "../../../web/public/locales/en/receipts.json";
import registerEn from "../../../web/public/locales/en/register.json";
import resetPasswordEn from "../../../web/public/locales/en/reset-password.json";
import settingsEn from "../../../web/public/locales/en/settings.json";
import userEn from "../../../web/public/locales/en/user.json";
import voidUserEn from "../../../web/public/locales/en/void-user.json";
import adminRu from "../../../web/public/locales/ru/admin.json";
import debtsRu from "../../../web/public/locales/ru/debts.json";
import defaultRu from "../../../web/public/locales/ru/default.json";
import emailRu from "../../../web/public/locales/ru/email.json";
import loginRu from "../../../web/public/locales/ru/login.json";
import peersRu from "../../../web/public/locales/ru/peers.json";
import receiptsRu from "../../../web/public/locales/ru/receipts.json";
import registerRu from "../../../web/public/locales/ru/register.json";
import resetPasswordRu from "../../../web/public/locales/ru/reset-password.json";
import settingsRu from "../../../web/public/locales/ru/settings.json";
import userRu from "../../../web/public/locales/ru/user.json";
import voidUserRu from "../../../web/public/locales/ru/void-user.json";

export const resources: Record<Language, Record<Namespace, object>> = {
	en: {
		default: defaultEn,
		settings: settingsEn,
		user: userEn,
		admin: adminEn,
		login: loginEn,
		receipts: receiptsEn,
		register: registerEn,
		"reset-password": resetPasswordEn,
		"void-user": voidUserEn,
		peers: peersEn,
		debts: debtsEn,
		email: emailEn,
	},
	ru: {
		default: defaultRu,
		settings: settingsRu,
		user: userRu,
		admin: adminRu,
		login: loginRu,
		receipts: receiptsRu,
		register: registerRu,
		"reset-password": resetPasswordRu,
		"void-user": voidUserRu,
		peers: peersRu,
		debts: debtsRu,
		email: emailRu,
	},
};
