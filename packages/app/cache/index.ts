import * as account from "./account";
import * as accountConnections from "./account-connection-intentions";
import * as accountSettings from "./account-settings";
import * as debts from "./debts";
import * as receiptTransferIntentions from "./receipt-transfer-intentions";
import * as receipts from "./receipts";
import * as users from "./users";

export const cache = {
	users,
	receipts,
	accountConnections,
	accountSettings,
	account,
	debts,
	receiptTransferIntentions,
};
