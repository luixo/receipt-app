import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<"users.unlink"> = {
	onMutate: (controllerContext) => (variables) =>
		mergeUpdaterResults(
			cache.users.updateRevert(controllerContext, {
				get: (controller) =>
					controller.update(
						variables.id,
						(user) => ({ ...user, connectedAccount: undefined }),
						(snapshot) => (user) => ({
							...user,
							connectedAccount: snapshot.connectedAccount,
						}),
					),
				getForeign: (controller) => controller.removeOwn(variables.id),
				getPaged: undefined,
			}),
			cache.receiptTransferIntentions.updateRevert(controllerContext, {
				getAll: (controller) =>
					mergeUpdaterResults(
						controller.outbound.updateAll(
							(outboundIntentions) =>
								outboundIntentions.filter(
									(intention) => intention.userId !== variables.id,
								),
							(outboundIntentionsSnapshot) => (outboundIntentions) => [
								...outboundIntentions,
								...outboundIntentionsSnapshot.filter(
									(intention) => intention.userId === variables.id,
								),
							],
						),
						controller.inbound.updateAll(
							(inboundIntentions) =>
								inboundIntentions.filter(
									(intention) => intention.userId !== variables.id,
								),
							(inboundIntentionsSnapshot) => (inboundIntentions) => [
								...inboundIntentions,
								...inboundIntentionsSnapshot.filter(
									(intention) => intention.userId === variables.id,
								),
							],
						),
					),
			}),
		),
	errorToastOptions: () => (error) => ({
		text: `Error unlinking user: ${error.message}`,
	}),
};
