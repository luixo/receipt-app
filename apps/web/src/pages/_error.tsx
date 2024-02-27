import React from "react";

import * as Sentry from "@sentry/nextjs";
import type { NextPage } from "next";
import type { ErrorProps } from "next/error";
import NextErrorComponent from "next/error";

const CustomErrorComponent: NextPage<ErrorProps> = ({ statusCode }) => (
	<NextErrorComponent statusCode={statusCode} />
);

CustomErrorComponent.getInitialProps = async (contextData) => {
	await Sentry.captureUnderscoreErrorException(contextData);
	return NextErrorComponent.getInitialProps(contextData);
};

export default CustomErrorComponent;
