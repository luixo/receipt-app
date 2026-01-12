/* eslint-disable import-x/no-extraneous-dependencies */
import accountEn from "@ra/web/public/locales/en/account.json";
import adminEn from "@ra/web/public/locales/en/admin.json";
import debtsEn from "@ra/web/public/locales/en/debts.json";
import defaultEn from "@ra/web/public/locales/en/default.json";
import loginEn from "@ra/web/public/locales/en/login.json";
import receiptsEn from "@ra/web/public/locales/en/receipts.json";
import registerEn from "@ra/web/public/locales/en/register.json";
import resetPasswordEn from "@ra/web/public/locales/en/reset-password.json";
import settingsEn from "@ra/web/public/locales/en/settings.json";
import usersEn from "@ra/web/public/locales/en/users.json";
import voidAccountEn from "@ra/web/public/locales/en/void-account.json";
import accountRu from "@ra/web/public/locales/ru/account.json";
import adminRu from "@ra/web/public/locales/ru/admin.json";
import debtsRu from "@ra/web/public/locales/ru/debts.json";
import defaultRu from "@ra/web/public/locales/ru/default.json";
import loginRu from "@ra/web/public/locales/ru/login.json";
import receiptsRu from "@ra/web/public/locales/ru/receipts.json";
import registerRu from "@ra/web/public/locales/ru/register.json";
import resetPasswordRu from "@ra/web/public/locales/ru/reset-password.json";
import settingsRu from "@ra/web/public/locales/ru/settings.json";
import usersRu from "@ra/web/public/locales/ru/users.json";
import voidAccountRu from "@ra/web/public/locales/ru/void-account.json";
/* eslint-enable import-x/no-extraneous-dependencies */

import type { Language, Namespace } from "~app/utils/i18n-data";

export const resources: Record<Language, Record<Namespace, object>> = {
	en: {
		default: defaultEn,
		settings: settingsEn,
		account: accountEn,
		admin: adminEn,
		login: loginEn,
		receipts: receiptsEn,
		register: registerEn,
		"reset-password": resetPasswordEn,
		"void-account": voidAccountEn,
		users: usersEn,
		debts: debtsEn,
	},
	ru: {
		default: defaultRu,
		settings: settingsRu,
		account: accountRu,
		admin: adminRu,
		login: loginRu,
		receipts: receiptsRu,
		register: registerRu,
		"reset-password": resetPasswordRu,
		"void-account": voidAccountRu,
		users: usersRu,
		debts: debtsRu,
	},
};
