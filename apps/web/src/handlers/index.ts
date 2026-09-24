import { t } from "~web/handlers/trpc";

import { router as adminRouter } from "./admin/index";
import { router as authRouter } from "./auth/index";
import { router as currencyRouter } from "./currency/index";
import { router as debtIntentionsRouter } from "./debt-intentions/index";
import { router as debtsRouter } from "./debts/index";
import { router as peersRouter } from "./peers/index";
import { router as receiptItemConsumersRouter } from "./receipt-item-consumers/index";
import { router as receiptItemPayersRouter } from "./receipt-item-payers/index";
import { router as receiptItemsRouter } from "./receipt-items/index";
import { router as receiptParticipantsRouter } from "./receipt-participants/index";
import { router as receiptsRouter } from "./receipts/index";
import { router as resetPasswordIntentionsRouter } from "./reset-password-intentions/index";
import { router as sessionsRouter } from "./sessions/index";
import { router as userConnectionIntentionsRouter } from "./user-connection-intentions/index";
import { router as userSettingsRouter } from "./user-settings/index";
import { router as userRouter } from "./user/index";
import { router as utilsRouter } from "./utils/index";

export const router = t.router({
	// No auth
	sessions: sessionsRouter,
	auth: authRouter,
	resetPasswordIntentions: resetPasswordIntentionsRouter,
	utils: utilsRouter,
	// Auth
	user: userRouter,
	userSettings: userSettingsRouter,
	receipts: receiptsRouter,
	receiptItems: receiptItemsRouter,
	peers: peersRouter,
	receiptParticipants: receiptParticipantsRouter,
	currency: currencyRouter,
	receiptItemConsumers: receiptItemConsumersRouter,
	receiptItemPayers: receiptItemPayersRouter,
	userConnectionIntentions: userConnectionIntentionsRouter,
	debts: debtsRouter,
	debtIntentions: debtIntentionsRouter,
	// Admin
	admin: adminRouter,
});
