import React from "react";

import { render } from "@react-email/components";
import type { ParseKeys } from "i18next";

import { createI18nContext } from "~app/utils/i18n";
import { BaseUrlContext } from "~web/email/components";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getBackendModule, getLanguageFromRequest } from "~web/utils/i18n";

import { ConfirmEmailEmail } from "./confirm-email-email";
import { ResetPasswordEmail } from "./reset-password-email";

const generateEmail = async (
	element: React.ReactElement,
	titlePath: ParseKeys<"email">,
	{ reqHeaders, baseUrl }: Pick<UnauthorizedContext, "reqHeaders" | "baseUrl">,
) => {
	const language = getLanguageFromRequest(reqHeaders);
	const i18nContext = createI18nContext({
		getLanguage: () => language,
		beforeInit: (instance) => instance.use(getBackendModule()),
	});
	await i18nContext.initialize({ language });
	await i18nContext.loadNamespaces("email");
	return {
		subject: i18nContext.getNamespacedTranslation("email")(titlePath),
		body: await render(
			<i18nContext.Provider>
				<BaseUrlContext value={baseUrl}>{element}</BaseUrlContext>
			</i18nContext.Provider>,
			{ pretty: true },
		),
	};
};

export const generateResetPasswordEmail = async (
	token: string,
	ctx: Parameters<typeof generateEmail>[2],
) =>
	generateEmail(
		<ResetPasswordEmail token={token} />,
		"subjects.resetPassword",
		ctx,
	);

export const generateConfirmEmailEmail = async (
	token: string,
	ctx: Parameters<typeof generateEmail>[2],
) =>
	generateEmail(
		<ConfirmEmailEmail token={token} />,
		"subjects.confirmEmail",
		ctx,
	);
