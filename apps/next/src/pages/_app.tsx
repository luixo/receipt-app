import { withTRPC } from "@trpc/next";
import { Provider } from "app/provider";
import { ReactQueryDevtools } from "react-query/devtools";
import getConfig from "next/config";
import Head from "next/head";
import React from "react";
import type { SolitoAppProps } from "solito";
import "raf/polyfill";
import type { AppRouter } from "./api/trpc/[trpc]";
import { NextConfig } from "next";
import {
	getQueryClientConfig,
	getSsrHost,
	TRPC_ENDPOINT,
} from "app/utils/queries";

const MyApp: React.FC<SolitoAppProps> = ({ Component, pageProps, ...rest }) => {
	return (
		<>
			<Head>
				<title>Receipt App</title>
				<meta name="description" content="Receipt App built on Solito" />
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<Provider>
				<ReactQueryDevtools />
				<Component {...pageProps} />
			</Provider>
		</>
	);
};

export default withTRPC<AppRouter>({
	config: () => {
		const queryClientConfig = getQueryClientConfig();
		if (typeof window !== "undefined") {
			return {
				url: TRPC_ENDPOINT,
				queryClientConfig,
			};
		}
		const nextConfig: NextConfig = getConfig();
		return {
			url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
			queryClientConfig,
		};
	},
	ssr: true,
})(MyApp);
