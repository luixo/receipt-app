import React from "react";

import * as Sentry from "@sentry/nextjs";

import { TRPC_ENDPOINT } from "~app/utils/queries";
import type { GetLinksOptions, SearchParams } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};

export const useLinks = (
	searchParams: SearchParams,
	options: Omit<Partial<GetLinksOptions>, "searchParams"> = {},
) =>
	React.useMemo(
		() =>
			getLinks(TRPC_ENDPOINT, {
				// Don't batch requests when in tests - to evaluate pending / error states separately
				useBatch: !searchParams.proxyPort,
				searchParams,
				source: "csr-next",
				captureError: captureSentryError,
				...options,
			}),
		[options, searchParams],
	);
