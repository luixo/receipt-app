import * as Sentry from "@sentry/nextjs";
import type { ParserBuilder } from "nuqs";
import {
	createLoader,
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
} from "nuqs";

import type { GetLinksOptions } from "~app/utils/trpc";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};

export const loadLinksParams = createLoader({
	debug: parseAsBoolean,
	proxyPort: parseAsInteger,
	controllerId: parseAsString,
} satisfies {
	[K in keyof GetLinksOptions["searchParams"]]: ParserBuilder<
		NonNullable<GetLinksOptions["searchParams"][K]>
	>;
});
