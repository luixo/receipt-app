import { t } from "~web/handlers/trpc";

import { router as accountRouter } from "./account/index";
import { router as accountConnectionIntentionsRouter } from "./account-connection-intentions/index";
import { router as accountSettingsRouter } from "./account-settings/index";
import { router as adminRouter } from "./admin/index";
import { router as authRouter } from "./auth/index";
import { router as currencyRouter } from "./currency/index";
import { router as debtIntentionsRouter } from "./debt-intentions/index";
import { router as debtsRouter } from "./debts/index";
import { router as receiptItemConsumersRouter } from "./receipt-item-consumers/index";
import { router as receiptItemPayersRouter } from "./receipt-item-payers/index";
import { router as receiptItemsRouter } from "./receipt-items/index";
import { router as receiptParticipantsRouter } from "./receipt-participants/index";
import { router as receiptsRouter } from "./receipts/index";
import { router as resetPasswordIntentionsRouter } from "./reset-password-intentions/index";
import { router as sessionsRouter } from "./sessions/index";
import { router as usersRouter } from "./users/index";
import { router as utilsRouter } from "./utils/index";

export const router = t.router({
	// No auth
	sessions: sessionsRouter,
	auth: authRouter,
	resetPasswordIntentions: resetPasswordIntentionsRouter,
	utils: utilsRouter,
	// Auth
	account: accountRouter,
	accountSettings: accountSettingsRouter,
	receipts: receiptsRouter,
	receiptItems: receiptItemsRouter,
	users: usersRouter,
	receiptParticipants: receiptParticipantsRouter,
	currency: currencyRouter,
	receiptItemConsumers: receiptItemConsumersRouter,
	receiptItemPayers: receiptItemPayersRouter,
	accountConnectionIntentions: accountConnectionIntentionsRouter,
	debts: debtsRouter,
	debtIntentions: debtIntentionsRouter,
	// Admin
	admin: adminRouter,
});
