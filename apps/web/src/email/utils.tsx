import React from "react";

import type { ParseKeys } from "i18next";
import * as ReactDOMServer from "react-dom/server";
import { entries } from "remeda";

import { createI18nContext } from "~app/utils/i18n";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getBackendModule, getLanguageFromRequest } from "~web/utils/i18n";

import { BaseUrlContext } from "./base-url-context";
import { ConfirmEmailEmail } from "./confirm-email-email";
import { ResetPasswordEmail } from "./reset-password-email";
import type { AugmentedProperies } from "./styling-context";
import { StylingContext } from "./styling-context";

const STYLE_REPLACER = "__style_replacer__";

type NestedStyles = { [key: string]: NestedStylesOrString };
type NestedStylesOrString = string | NestedStyles;

const convertStylesToString = (styles: AugmentedProperies): string =>
	entries(styles)
		.map(
			([key, value]) =>
				`${key.replaceAll(
					/[A-Z]/g,
					(match) => `-${match.toLowerCase()}`,
				)}:${String(value)};`,
		)
		.join("");

const reduceStyles = (styles: NestedStyles): string =>
	entries(styles).reduce((acc, [selector, style]) => {
		if (typeof style === "string") {
			return `${acc} ${selector} {${style}}`;
		}
		return `${acc} ${selector} {${reduceStyles(style)}}`;
	}, "");

const generateEmail = async (
	ctx: UnauthorizedContext,
	element: React.ReactElement,
	titlePath: ParseKeys<"email">,
) => {
	const language = getLanguageFromRequest(
		new Headers(
			entries(ctx.req.headers).filter(
				(entry): entry is [string, string] => typeof entry[1] === "string",
			),
		),
	);
	const i18nContext = createI18nContext({
		getLanguage: () => language,
		beforeInit: (instance) => instance.use(getBackendModule()),
	});
	await i18nContext.initialize({ language });
	await i18nContext.loadNamespaces("email");
	const t = i18nContext.getNamespacedTranslation("email");
	const stylesMapping: React.ContextType<typeof StylingContext> = {};
	const markup = `
	<!doctype html lang="en">
	<html lang="en">
		<head>
			<meta name="viewport" content="width=device-width" />
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
			<title>Receipt App</title>
			${STYLE_REPLACER}
		</head>
		<body>${ReactDOMServer.renderToStaticMarkup(
			<StylingContext value={stylesMapping}>
				<BaseUrlContext value={ctx.emailOptions.baseUrl}>
					<i18nContext.Provider>{element}</i18nContext.Provider>
				</BaseUrlContext>
			</StylingContext>,
		)}
		</body>
	</html>`;
	const nestedStyles = entries(stylesMapping).reduce<NestedStyles>(
		(acc: NestedStyles, [selector, { default: styles, ...mediaObject }]) => {
			/* oxlint-disable no-param-reassign */
			if (styles) {
				acc[selector] = convertStylesToString(styles);
			}
			for (const [mediaKey, mediaStyles] of entries(mediaObject)) {
				if (!acc[mediaKey]) {
					acc[mediaKey] = {};
				}
				(acc[mediaKey] as NestedStyles)[selector] =
					convertStylesToString(mediaStyles);
			}
			return acc;
			/* oxlint-enable no-param-reassign */
		},
		{},
	);
	return {
		subject: t(titlePath),
		body: markup.replace(
			STYLE_REPLACER,
			`<style>${reduceStyles(nestedStyles)}</style>`,
		),
	};
};

export const generateResetPasswordEmail = async (
	ctx: UnauthorizedContext,
	token: string,
) =>
	generateEmail(
		ctx,
		<ResetPasswordEmail token={token} />,
		"subjects.resetPassword",
	);

export const generateConfirmEmailEmail = async (
	ctx: UnauthorizedContext,
	token: string,
) =>
	generateEmail(
		ctx,
		<ConfirmEmailEmail token={token} />,
		"subjects.confirmEmail",
	);
