import type * as React from "react";
import { AppRegistry } from "react-native";

import { parse } from "cookie";
import NextDocument, { Head, Html, Main, NextScript } from "next/document";

import {
	type ColorMode,
	LAST_COLOR_MODE_STORE_NAME,
	SELECTED_COLOR_MODE_STORE_NAME,
} from "~app/utils/store/color-modes";
import { schemas } from "~app/utils/store-data";
import { NATIVE_STYLESHEET_PRELOAD_ID } from "~web/pages/_app";

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
					<link
						rel="stylesheet"
						href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
					/>
				</Head>
				<body className="font-sans">
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

Document.getInitialProps = async (ctx) => {
	const prevProps = await ctx.defaultGetInitialProps(ctx);
	// Document always has cookies
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const cookies = parse(ctx.req!.headers.cookie ?? "");
	const colorMode =
		schemas[SELECTED_COLOR_MODE_STORE_NAME].parse(
			cookies[SELECTED_COLOR_MODE_STORE_NAME],
		) ||
		schemas[LAST_COLOR_MODE_STORE_NAME].parse(
			cookies[LAST_COLOR_MODE_STORE_NAME],
		);
	return {
		...prevProps,
		colorMode,
	};
};

export default Document;
