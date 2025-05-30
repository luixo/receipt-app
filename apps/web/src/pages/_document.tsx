import type * as React from "react";
import { AppRegistry } from "react-native";

import { getCookie } from "cookies-next";
import { extractCss } from "goober";
import NextDocument, { Head, Html, Main, NextScript } from "next/document";

import {
	type ColorMode,
	LAST_COLOR_MODE_STORE_NAME,
	SELECTED_COLOR_MODE_STORE_NAME,
} from "~app/utils/store/color-modes";
import { schemas } from "~app/utils/store-data";
import { NATIVE_STYLESHEET_PRELOAD_ID } from "~web/hooks/use-remove-preloaded-css";

type NativeWebAppRegistry = typeof AppRegistry & {
	getApplication: (name: string) => {
		getStyleElement: () => React.ReactElement<{
			dangerouslySetInnerHTML: { __html: string };
			id: string;
		}>;
	};
};

const getNativeCss = () => {
	AppRegistry.registerComponent("Main", () => Main);
	// see https://github.com/necolas/react-native-web/issues/832#issuecomment-1229676492
	const { getStyleElement } = (
		AppRegistry as NativeWebAppRegistry
	).getApplication("Main");
	const style = getStyleElement();
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
	colorMode: ColorMode;
};

class Document extends NextDocument<DocumentProps> {
	render() {
		return (
			<Html className={this.props.colorMode}>
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
	const colorMode =
		schemas[SELECTED_COLOR_MODE_STORE_NAME].parse(
			getCookie(SELECTED_COLOR_MODE_STORE_NAME, ctx),
		) ||
		schemas[LAST_COLOR_MODE_STORE_NAME].parse(
			getCookie(LAST_COLOR_MODE_STORE_NAME, ctx),
		);
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
		colorMode,
	};
};

export default Document;
