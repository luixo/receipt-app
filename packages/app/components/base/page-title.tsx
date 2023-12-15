import React from "react";

import Head from "next/head";

type Props = {
	children?: string;
};

// add React.memo when https://github.com/vercel/next.js/issues/59655 is resolved
export const PageTitle: React.FC<Props> = ({ children }) => (
	<Head>
		<title>{["RA", children].filter(Boolean).join(" - ")}</title>
	</Head>
);
