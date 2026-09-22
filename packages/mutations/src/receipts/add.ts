import type { AccountId, PeerId } from "~db/ids";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountId }
> = {
	mutationKey: "receipts.add",
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(result, variables) => {
			updateReceipts(controllerContext, {
				getPaged: (controller) => {
					void controller.invalidate();
				},
				get: (controller) => {
					const selfPeerId = selfAccountId as PeerId;
					controller.add({
						id: result.id,
						createdAt: result.createdAt,
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						participants:
							variables.participants?.map(({ peerId, role }, index) => {
								const matchedResult = result.participants[index];
								if (!matchedResult) {
									throw new Error(
										`Expected to have item index ${index} returned from receipt creation.`,
									);
								}
								return {
									role: peerId === selfPeerId ? "owner" : role,
									createdAt: matchedResult.createdAt,
									peerId,
								};
							}) ?? [],
						items:
							variables.items?.map((item, index) => {
								const matchedItem = result.items[index];
								if (!matchedItem) {
									throw new Error(
										`Expected to have item index ${index} returned from receipt creation.`,
									);
								}
								return {
									id: matchedItem.id,
									createdAt: matchedItem.createdAt,
									name: item.name,
									price: item.price,
									quantity: item.quantity,
									consumers:
										item.consumers?.map((consumer) => {
											const matchedConsumer = matchedItem.consumers?.find(
												(lookupConsumer) =>
													lookupConsumer.peerId === consumer.peerId,
											);
											if (!matchedConsumer) {
												throw new Error(
													`Expected to have consumer with peer id "${consumer.peerId}" returned from receipt creation.`,
												);
											}
											return {
												peerId: consumer.peerId,
												part: consumer.part,
												createdAt: matchedConsumer.createdAt,
											};
										}) ?? [],
									payers:
										item.payers?.map((payer) => {
											const matchedPayer = matchedItem.payers?.find(
												(lookupPayer) => lookupPayer.peerId === payer.peerId,
											);
											if (!matchedPayer) {
												throw new Error(
													`Expected to have payer with peer id "${payer.peerId}" returned from receipt creation.`,
												);
											}
											return {
												peerId: payer.peerId,
												part: payer.part,
												createdAt: matchedPayer.createdAt,
											};
										}) ?? [],
								};
							}) ?? [],
						payers:
							variables.payers?.map((payer, index) => {
								const matchedResult = result.payers[index];
								if (!matchedResult) {
									throw new Error(
										`Expected to have payer index ${index} returned from receipt creation.`,
									);
								}
								return {
									createdAt: matchedResult.createdAt,
									peerId: payer.peerId,
									part: payer.part,
								};
							}) ?? [],
						ownerPeerId: selfPeerId,
						selfPeerId,
						debts: { direction: "outcoming", debts: [] },
					});
				},
			});
		},
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.addReceipt.mutate", {
				ns: "receipts",
				receiptsCount: variablesSet.length,
				receipts: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	successToastOptions:
		({ t }) =>
		(_result, variablesSet) => ({
			text: t("toasts.addReceipt.success", {
				ns: "receipts",
				receiptsCount: variablesSet.length,
				receipts: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.addReceipt.error", {
				ns: "receipts",
				receipts: variablesSet.map((variables) => `"${variables.name}"`),
				errors,
			}),
		}),
};
