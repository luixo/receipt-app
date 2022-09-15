import * as accountConnections from "./account-connection-intentions";
import * as auth from "./auth";
import * as debts from "./debts";
import * as debtsSyncIntentions from "./debts-sync-intentions";
import * as itemParticipants from "./item-participants";
import * as receiptItems from "./receipt-items";
import * as receiptParticipants from "./receipt-participants";
import * as receipts from "./receipts";
import * as users from "./users";

export const mutations = {
	users,
	receipts,
	receiptItems,
	accountConnections,
	receiptParticipants,
	itemParticipants,
	debts,
	debtsSyncIntentions,
	auth,
};
