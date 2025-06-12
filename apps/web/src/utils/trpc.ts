import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { GetLinksOptions } from "~app/utils/trpc";
import type { NetContext } from "~web/handlers/context";
import { rootSearchParamsSchema } from "~web/pages/_app";
import { captureSentryError } from "~web/utils/sentry";

export const getHostUrl = (reqUrl?: string, pathname = "") => {
	if (!reqUrl) {
		return "";
	}
	const url = new URL("", reqUrl);
	url.pathname = pathname;
	if (process.env.VERCEL_URL) {
		url.host = process.env.VERCEL_URL;
	}
	return url.toString();
};

export const getLinksParamsFromRequest = (
	req: NetContext["req"],
	source: GetLinksOptions["source"],
) => {
	const url = new URL(req.url ?? "");
	const validatedParams = rootSearchParamsSchema.safeParse(url.searchParams);
	return {
		searchParams: validatedParams.success ? validatedParams.data : {},
		url: getHostUrl(req.url, DEFAULT_TRPC_ENDPOINT),
		headers: {
			cookie: req.headers.cookie,
		},
		source,
		captureError: captureSentryError,
	};
};
