import React from "react";

import { render } from "@react-email/components";
import type { ParseKeys } from "i18next";

import { createI18nContext } from "~app/utils/i18n";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getBackendModule, getLanguageFromRequest } from "~web/utils/i18n";

import { ConfirmEmailEmail } from "./confirm-email-email";
import { ResetPasswordEmail } from "./reset-password-email";

const generateEmail = async (
	ctx: UnauthorizedContext,
	element: React.ReactElement,
	titlePath: ParseKeys<"email">,
) => {
	const language = getLanguageFromRequest(ctx.reqHeaders);
	const i18nContext = createI18nContext({
		getLanguage: () => language,
		beforeInit: (instance) => instance.use(getBackendModule()),
	});
	await i18nContext.initialize({ language });
	await i18nContext.loadNamespaces("email");

	return {
		subject: i18nContext.getNamespacedTranslation("email")(titlePath),
		body: await render(<i18nContext.Provider>{element}</i18nContext.Provider>),
	};
};

export const generateResetPasswordEmail = async (
	ctx: UnauthorizedContext,
	token: string,
) =>
	generateEmail(
		ctx,
		<ResetPasswordEmail baseUrl={ctx.emailOptions.baseUrl} token={token} />,
		"subjects.resetPassword",
	);

export const generateConfirmEmailEmail = async (
	ctx: UnauthorizedContext,
	token: string,
) =>
	generateEmail(
		ctx,
		<ConfirmEmailEmail baseUrl={ctx.emailOptions.baseUrl} token={token} />,
		"subjects.confirmEmail",
	);
