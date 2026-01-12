import * as Sentry from "@sentry/react-native";

import type { GetLinksOptions } from "~app/utils/trpc";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	// eslint-disable-next-line no-console
	console.error("Error occurred:", error, transactionId);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};
