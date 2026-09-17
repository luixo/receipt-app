import * as Sentry from "@sentry/tanstackstart-react";

import type { GetLinksOptions } from "~app/utils/trpc";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	// oxlint-disable-next-line no-console
	console.error(
		"Error occurred:",
		error,
		...(import.meta.env.MODE === "test" ? [error.message, error.stack] : []),
		transactionId,
	);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};
