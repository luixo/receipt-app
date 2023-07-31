import * as account from "./account";
import * as accountConnections from "./account-connection-intentions";
import * as debts from "./debts";
import * as receiptItems from "./receipt-items";
import * as receipts from "./receipts";
import * as users from "./users";

export const cache = {
	users,
	receipts,
	receiptItems,
	accountConnections,
	account,
	debts,
};
