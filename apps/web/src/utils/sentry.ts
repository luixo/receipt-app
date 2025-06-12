import * as Sentry from "@sentry/nextjs";

import type { GetLinksOptions } from "~app/utils/trpc";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};
