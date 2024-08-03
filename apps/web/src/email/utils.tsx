import React from "react";

import * as ReactDOMServer from "react-dom/server";
import { entries } from "remeda";

import type { UnauthorizedContext } from "~web/handlers/context";

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
				`${key.replace(
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

const generateEmail = (
	ctx: UnauthorizedContext,
	element: React.ReactElement,
) => {
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
			<StylingContext.Provider value={stylesMapping}>
				<BaseUrlContext.Provider value={ctx.emailOptions.baseUrl}>
					{element}
				</BaseUrlContext.Provider>
			</StylingContext.Provider>,
		)}
		</body>
	</html>`;
	const nestedStyles = entries(stylesMapping).reduce<NestedStyles>(
		(acc: NestedStyles, [selector, { default: styles, ...mediaObject }]) => {
			if (styles) {
				acc[selector] = convertStylesToString(styles);
			}
			entries(mediaObject).forEach(([mediaKey, mediaStyles]) => {
				if (!acc[mediaKey]) {
					acc[mediaKey] = {};
				}
				(acc[mediaKey] as NestedStyles)[selector] =
					convertStylesToString(mediaStyles);
			});
			return acc;
		},
		{} as NestedStyles,
	);
	return markup.replace(
		STYLE_REPLACER,
		`<style>${reduceStyles(nestedStyles)}</style>`,
	);
};

export const generateResetPasswordEmail = (
	ctx: UnauthorizedContext,
	token: string,
) => generateEmail(ctx, <ResetPasswordEmail token={token} />);

export const generateConfirmEmailEmail = (
	ctx: UnauthorizedContext,
	token: string,
) => generateEmail(ctx, <ConfirmEmailEmail token={token} />);
