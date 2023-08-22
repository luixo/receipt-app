import * as React from "react";

import { CssBaseline } from "@nextui-org/react";
import { getCookie } from "cookies-next";
import { extractCss } from "goober";
import NextDocument, { Head, Html, Main, NextScript } from "next/document";

import type { ColorMode } from "app/contexts/color-mode-context";
import { LAST_COLOR_MODE_COOKIE_NAME } from "app/contexts/color-mode-context";

type DocumentProps = {
	lastColorMode: ColorMode;
};

class Document extends NextDocument<DocumentProps> {
	render() {
		return (
			<Html
				className={
					this.props.lastColorMode === "dark" ? "dark-theme" : "light-theme"
				}
			>
				<Head>
					<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

Document.getInitialProps = async (ctx) => {
	const prevProps = await ctx.defaultGetInitialProps(ctx);
	const lastColorModeCookie = getCookie(LAST_COLOR_MODE_COOKIE_NAME, ctx);
	const lastColorMode: ColorMode =
		lastColorModeCookie === "dark" ? "dark" : "light";
	return {
		...prevProps,
		styles: (
			<>
				{prevProps.styles}
				{/* see https://github.com/timolins/react-hot-toast/issues/189#issuecomment-1256797662 */}
				<style id="_goober">
					{"/* ! */"} {extractCss()}
				</style>
				{CssBaseline.flush()}
			</>
		),
		lastColorMode,
	};
};

export default Document;
