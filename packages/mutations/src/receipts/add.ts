import type { AccountsId, UsersId } from "~db/models";
import { mergeErrors } from "~mutations/utils";

import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getReceiptTexts } from "./utils";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	mutationKey: "receipts.add",
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(result, variables) => {
			updateReceipts(controllerContext, {
				getPaged: (controller) => controller.invalidate(),
				get: (controller) => {
					const selfUserId = selfAccountId as UsersId;
					controller.add({
						id: result.id,
						createdAt: result.createdAt,
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						participants:
							variables.participants?.map(({ userId, role }, index) => {
								const matchedResult = result.participants[index];
								if (!matchedResult) {
									throw new Error(
										`Expected to have item index ${index} returned from receipt creation.`,
									);
								}
								return {
									role: userId === selfUserId ? "owner" : role,
									createdAt: matchedResult.createdAt,
									userId,
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
													lookupConsumer.userId === consumer.userId,
											);
											if (!matchedConsumer) {
												throw new Error(
													`Expected to have consumer with user id "${consumer.userId}" returned from receipt creation.`,
												);
											}
											return {
												userId: consumer.userId,
												part: consumer.part,
												createdAt: matchedConsumer.createdAt,
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
									userId: payer.userId,
									part: payer.part,
								};
							}) ?? [],
						ownerUserId: selfUserId,
						selfUserId,
						debts: { direction: "outcoming", debts: [] },
					});
				},
			});
		},
	mutateToastOptions: () => (variablesSet) => ({
		text: `Adding receipt${variablesSet.length > 1 ? "s" : ""} ${getReceiptTexts(variablesSet)}..`,
	}),
	successToastOptions: () => (_result, variablesSet) => ({
		text: `Receipt${variablesSet.length > 1 ? "s" : ""} ${getReceiptTexts(variablesSet)} added`,
	}),
	errorToastOptions: () => (errors, variablesSet) => ({
		text: `Error adding receipt ${getReceiptTexts(variablesSet)}: ${mergeErrors(errors)}`,
	}),
};
