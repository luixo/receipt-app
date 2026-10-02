import type { PeerId, ReceiptItemId, UserId } from "~db/ids";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfUserId: UserId }
> = {
	mutationKey: "receipts.add",
	onSuccess:
		(controllerContext, { selfUserId }) =>
		(result, variables) => {
			updateReceipts(controllerContext, {
				getPaged: (controller) => {
					void controller.invalidate();
				},
				get: (controller) => {
					const selfPeerId = selfUserId as PeerId;
					const items =
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
									item.consumers?.map((consumer) => ({
										...consumer,
										createdAt:
											matchedItem.consumers?.find(
												(match) => match.peerId === consumer.peerId,
											)?.createdAt ?? matchedItem.createdAt,
									})) ?? [],
								payers:
									item.payers?.map((payer) => ({
										...payer,
										createdAt:
											matchedItem.payers?.find(
												(match) => match.peerId === payer.peerId,
											)?.createdAt ?? matchedItem.createdAt,
									})) ?? [],
							};
						}) ?? [];
					const singleItem = {
						id: result.id as ReceiptItemId,
						createdAt: result.createdAt,
						name: "",
						price: 0,
						quantity: 0,
						consumers:
							variables.payers?.map((payer) => ({
								peerId: payer.peerId,
								part: payer.part,
								createdAt:
									result.payers.find((match) => match.peerId === payer.peerId)
										?.createdAt ?? result.createdAt,
							})) ?? [],
						payers: [],
					};
					const modeData =
						variables.mode === "single"
							? {
									mode: "single" as const,
									singleItem,
									multipleItems: items,
									items: [singleItem],
								}
							: {
									mode: "multiple" as const,
									singleItem,
									multipleItems: items,
									items,
								};
					controller.add({
						...modeData,
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
