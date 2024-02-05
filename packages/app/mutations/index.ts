import * as account from "./account";
import * as accountConnections from "./account-connection-intentions";
import * as accountSettings from "./account-settings";
import * as auth from "./auth";
import * as debts from "./debts";
import * as itemParticipants from "./item-participants";
import * as receiptItems from "./receipt-items";
import * as receiptParticipants from "./receipt-participants";
import * as receiptTransferIntentions from "./receipt-transfer-intentions";
import * as receipts from "./receipts";
import * as resetPasswordIntentions from "./reset-password-intentions";
import * as users from "./users";

export const mutations = {
	users,
	receipts,
	receiptItems,
	accountConnections,
	receiptParticipants,
	itemParticipants,
	debts,
	auth,
	account,
	accountSettings,
	resetPasswordIntentions,
	receiptTransferIntentions,
};
