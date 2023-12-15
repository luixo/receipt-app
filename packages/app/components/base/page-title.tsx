import React from "react";

import Head from "next/head";

type Props = {
	children?: string;
};

export const PageTitle = React.memo<Props>(({ children }) => (
	<Head>
		<title>{["RA", children].filter(Boolean).join(" - ")}</title>
	</Head>
));
