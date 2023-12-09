import type { QueryClientConfig } from "@tanstack/react-query";
import Constants from "expo-constants";

import { MINUTE } from "app/utils/time";

export const getNativeBaseUrl = () => {
	const host = Constants.manifest?.extra?.host;
	if (!host) {
		throw new Error(
			"Expected to have BACKEND_HOST environment variable in extra specification in app.config.ts",
		);
	}
	return host;
};

export const getQueryClientConfig = (): QueryClientConfig => ({
	defaultOptions: {
		queries: {
			retry: false,
			retryOnMount: false,
			staleTime: MINUTE,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	},
});

export const TRPC_ENDPOINT = "/api/trpc";

export const getSsrHost = (serverPort: number) => {
	const host = process.env.VERCEL_URL || `localhost:${serverPort}`;
	const secure = Boolean(process.env.VERCEL_URL);
	return `http${secure ? "s" : ""}://${host}${TRPC_ENDPOINT}`;
};
