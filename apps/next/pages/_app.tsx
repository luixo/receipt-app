import { Provider } from "app/provider";
import Head from "next/head";
import React from "react";
import type { SolitoAppProps } from "solito";
import "raf/polyfill";

const MyApp: React.FC<SolitoAppProps> = ({ Component, pageProps }) => {
	return (
		<>
			<Head>
				<title>Receipt App</title>
				<meta name="description" content="Receipt App built on Solito" />
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<Provider>
				<Component {...pageProps} />
			</Provider>
		</>
	);
};

export default MyApp;
