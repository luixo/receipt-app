import { t } from "next-app/handlers/trpc";

import { router as accountRouter } from "./account/index";
import { router as accountConnectionIntentionsRouter } from "./account-connection-intentions/index";
import { router as authRouter } from "./auth";
import { router as currencyRouter } from "./currency/index";
import { router as debtsRouter } from "./debts/index";
import { router as debtsSyncIntentionsRouter } from "./debts-sync-intentions/index";
import { router as itemParticipantsRouter } from "./item-participants/index";
import { router as receiptItemsRouter } from "./receipt-items/index";
import { router as receiptParticipantsRouter } from "./receipt-participants/index";
import { router as receiptsRouter } from "./receipts/index";
import { router as resetPasswordIntentionsRouter } from "./reset-password-intentions";
import { router as sessionsRouter } from "./sessions/index";
import { router as usersRouter } from "./users/index";

export const router = t.router({
	// No auth
	sessions: sessionsRouter,
	auth: authRouter,
	resetPasswordIntentions: resetPasswordIntentionsRouter,
	// Auth
	account: accountRouter,
	receipts: receiptsRouter,
	receiptItems: receiptItemsRouter,
	users: usersRouter,
	receiptParticipants: receiptParticipantsRouter,
	currency: currencyRouter,
	itemParticipants: itemParticipantsRouter,
	accountConnectionIntentions: accountConnectionIntentionsRouter,
	debts: debtsRouter,
	debtsSyncIntentions: debtsSyncIntentionsRouter,
});
