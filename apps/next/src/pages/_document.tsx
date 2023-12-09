import * as React from "react";
import { AppRegistry } from "react-native";

import { getCookie } from "cookies-next";
import { extractCss } from "goober";
import NextDocument, { Head, Html, Main, NextScript } from "next/document";

import type { ColorMode } from "app/contexts/color-mode-context";
import { LAST_COLOR_MODE_COOKIE_NAME } from "app/contexts/color-mode-context";
import { NATIVE_STYLESHEET_PRELOAD_ID } from "next-app/hooks/use-remove-preloaded-css";

const getNativeCss = () => {
	AppRegistry.registerComponent("Main", () => Main);
	// see https://github.com/necolas/react-native-web/issues/832#issuecomment-1229676492
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { getStyleElement } = (AppRegistry as any).getApplication("Main");
	const style = getStyleElement() as React.ReactElement<{
		dangerouslySetInnerHTML: { __html: string };
		id: string;
	}>;
	return {
		...style,
		props: {
			...style.props,
			id: NATIVE_STYLESHEET_PRELOAD_ID,
			dangerouslySetInnerHTML: {
				// eslint-disable-next-line no-underscore-dangle
				__html: style.props.dangerouslySetInnerHTML.__html
					.split("\n")
					// Only preloading styles from base react-native - View, Text etc.
					.filter((row) => row.startsWith(".css"))
					.join("\n"),
			},
		},
	};
};

type DocumentProps = {
	lastColorMode: ColorMode;
};

class Document extends NextDocument<DocumentProps> {
	render() {
		return (
			<Html className={this.props.lastColorMode}>
				<Head>
					<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
					{getNativeCss()}
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
				{/* see https://github.com/timolins/react-hot-toast/issues/189#issuecomment-1256797662 */}
				<style id="_goober">
					{"/* ! */"} {extractCss()}
				</style>
				{prevProps.styles}
			</>
		),
		lastColorMode,
	};
};

export default Document;
