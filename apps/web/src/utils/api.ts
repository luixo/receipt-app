import { createTRPCClient } from "@trpc/client";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { getLinks } from "~app/utils/trpc";
import type { NetContext } from "~web/handlers/context";
import { rootSearchParamsSchema } from "~web/pages/_app";
import { getCookie } from "~web/utils/cookies";
import { getReqHeader } from "~web/utils/headers";
import { captureSentryError } from "~web/utils/trpc";

export const getSsrHost = (endpoint: string) => {
	const url = new URL("http://localhost");
	if (process.env.VERCEL_URL) {
		url.host = process.env.VERCEL_URL;
		url.protocol = "https:";
	} else {
		const port = Number.parseInt(process.env.PORT || "", 10);
		if (!Number.isNaN(port)) {
			url.port = port.toString();
		}
	}
	url.pathname = endpoint;
	return url.toString();
};

const pickAuthCookie = (req: Parameters<typeof getTrpcClient>[0]) => {
	const authCookie = getCookie(getReqHeader(req, "cookie"), AUTH_COOKIE);
	if (authCookie) {
		return `${AUTH_COOKIE}=${authCookie}`;
	}
	return "";
};

export const getTrpcClient = (req: NetContext["req"]) => {
	const validatedParams = rootSearchParamsSchema.safeParse(
		new URL(req.url ?? "").searchParams,
	);
	return createTRPCClient<AppRouter>({
		links: getLinks({
			searchParams: validatedParams.success ? validatedParams.data : {},
			url: getSsrHost(DEFAULT_TRPC_ENDPOINT),
			headers: {
				cookie: pickAuthCookie(req),
			},
			source: "api",
			captureError: captureSentryError,
		}),
	});
};
