import { ColumnType, UpdateKeys, UpdateType } from "kysely";

import * as models from "./models";

type SelectTypeMap = {
	accountConnectionsIntentions: models.AccountConnectionsIntentions;
	accounts: models.Accounts;
	accountSettings: models.AccountSettings;
	debts: models.Debts;
	itemParticipants: models.ItemParticipants;
	receiptItems: models.ReceiptItems;
	receiptParticipants: models.ReceiptParticipants;
	receipts: models.Receipts;
	resetPasswordIntentions: models.ResetPasswordIntentions;
	sessions: models.Sessions;
	users: models.Users;
};

type InsertTypeMap = {
	accountConnectionsIntentions: models.AccountConnectionsIntentionsInitializer;
	accounts: models.AccountsInitializer;
	accountSettings: models.AccountSettingsInitializer;
	debts: models.DebtsInitializer;
	itemParticipants: models.ItemParticipantsInitializer;
	receiptItems: models.ReceiptItemsInitializer;
	receiptParticipants: models.ReceiptParticipantsInitializer;
	receipts: models.ReceiptsInitializer;
	resetPasswordIntentions: models.ResetPasswordIntentionsInitializer;
	sessions: models.SessionsInitializer;
	users: models.UsersInitializer;
} & Record<string, never>;

type UpdateTypeMap = {
	accountConnectionsIntentions: models.AccountConnectionsIntentionsMutator;
	accounts: models.AccountsMutator;
	accountSettings: models.AccountSettingsMutator;
	debts: models.DebtsMutator;
	itemParticipants: models.ItemParticipantsMutator;
	receiptItems: models.ReceiptItemsMutator;
	receiptParticipants: models.ReceiptParticipantsMutator;
	receipts: models.ReceiptsMutator;
	resetPasswordIntentions: models.ResetPasswordIntentionsMutator;
	sessions: models.SessionsMutator;
	users: models.UsersMutator;
} & Record<string, never>;

type TableColumnType<
	SelectTable,
	InsertTable extends Partial<SelectTable>,
	UpdateTable extends Partial<SelectTable>,
> = Required<{
	[Column in keyof SelectTable]: ColumnType<
		SelectTable[Column],
		InsertTable[Column],
		UpdateTable[Column]
	>;
}>;

type SecondDeepPartial<T> = {
	[LK in keyof T]: Partial<T[LK]>;
};

type DatabaseColumnType<
	SelectDatabase,
	InsertDatabase extends SecondDeepPartial<SelectDatabase> &
		Record<string, never>,
	UpdateDatabase extends SecondDeepPartial<SelectDatabase> &
		Record<string, never>,
> = {
	[Table in keyof SelectDatabase]: TableColumnType<
		SelectDatabase[Table],
		InsertDatabase[Table],
		UpdateDatabase[Table]
	>;
};

export type ReceiptsDatabase = DatabaseColumnType<
	SelectTypeMap,
	InsertTypeMap,
	UpdateTypeMap
>;

export type SimpleUpdateObject<TB extends keyof ReceiptsDatabase> = {
	[C in UpdateKeys<ReceiptsDatabase[TB]>]?: UpdateType<ReceiptsDatabase[TB][C]>;
};
