import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~web/db/models";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<
	"receiptTransferIntentions.add",
	{
		receipt: {
			name: string;
			issued: Date;
			sum: number;
			currencyCode: CurrencyCode;
		};
		targetUserId: UsersId;
	}
> = {
	onMutate:
		(controllerContext, { receipt: receiptContext, targetUserId }) =>
		({ receiptId }) =>
			mergeUpdaterResults(
				cache.receipts.updateRevert(controllerContext, {
					get: (controller) =>
						controller.update(
							receiptId,
							(receipt) => ({
								...receipt,
								transferIntentionUserId: targetUserId,
							}),
							(snapshot) => (receipt) => ({
								...receipt,
								transferIntentionUserId: snapshot.transferIntentionUserId,
							}),
						),
					getNonResolvedAmount: undefined,
					getPaged: undefined,
				}),
				cache.receiptTransferIntentions.updateRevert(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							receipt: {
								id: receiptId,
								name: receiptContext.name,
								issued: receiptContext.issued,
								sum: receiptContext.sum,
								currencyCode: receiptContext.currencyCode,
							},
							userId: targetUserId,
						}),
				}),
			),
	successToastOptions: () => (_result, variables) => ({
		text: `Receipt transfer intention was sent to "${variables.targetEmail}"`,
	}),
	errorToastOptions: () => (error) => ({
		text: `Error transferring receipt: ${error.message}`,
	}),
};
