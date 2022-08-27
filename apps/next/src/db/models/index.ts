// @generated
// Automatically generated. Don't change this file manually.

import AccountConnectionsIntentions, {
	AccountConnectionsIntentionsInitializer,
} from "./account-connections-intentions";
import Accounts, { AccountsInitializer, AccountsId } from "./accounts";
import Debts, { DebtsInitializer, DebtsId } from "./debts";
import DebtsSyncIntentions, {
	DebtsSyncIntentionsInitializer,
} from "./debts-sync-intentions";
import ItemParticipants, {
	ItemParticipantsInitializer,
} from "./item-participants";
import KyselyMigration, {
	KyselyMigrationInitializer,
	KyselyMigrationId,
} from "./kysely-migration";
import KyselyMigrationLock, {
	KyselyMigrationLockInitializer,
	KyselyMigrationLockId,
} from "./kysely-migration-lock";
import ReceiptItems, {
	ReceiptItemsInitializer,
	ReceiptItemsId,
} from "./receipt-items";
import ReceiptParticipants, {
	ReceiptParticipantsInitializer,
} from "./receipt-participants";
import Receipts, { ReceiptsInitializer, ReceiptsId } from "./receipts";
import ResetPasswordIntentions, {
	ResetPasswordIntentionsInitializer,
} from "./reset-password-intentions";
import Sessions, { SessionsInitializer, SessionsId } from "./sessions";
import Users, { UsersInitializer, UsersId } from "./users";

type Model =
	| AccountConnectionsIntentions
	| Accounts
	| Debts
	| DebtsSyncIntentions
	| ItemParticipants
	| KyselyMigration
	| KyselyMigrationLock
	| ReceiptItems
	| ReceiptParticipants
	| Receipts
	| ResetPasswordIntentions
	| Sessions
	| Users;

interface ModelTypeMap {
	accountConnectionsIntentions: AccountConnectionsIntentions;
	accounts: Accounts;
	debts: Debts;
	debtsSyncIntentions: DebtsSyncIntentions;
	itemParticipants: ItemParticipants;
	kysely_migration: KyselyMigration;
	kysely_migration_lock: KyselyMigrationLock;
	receiptItems: ReceiptItems;
	receiptParticipants: ReceiptParticipants;
	receipts: Receipts;
	resetPasswordIntentions: ResetPasswordIntentions;
	sessions: Sessions;
	users: Users;
}

type ModelId =
	| AccountsId
	| KyselyMigrationId
	| KyselyMigrationLockId
	| ReceiptItemsId
	| ReceiptsId
	| SessionsId
	| UsersId
	| DebtsId;

interface ModelIdTypeMap {
	accounts: AccountsId;
	kysely_migration: KyselyMigrationId;
	kysely_migration_lock: KyselyMigrationLockId;
	receiptItems: ReceiptItemsId;
	receipts: ReceiptsId;
	sessions: SessionsId;
	users: UsersId;
	debts: DebtsId;
}

type Initializer =
	| AccountConnectionsIntentionsInitializer
	| AccountsInitializer
	| DebtsInitializer
	| DebtsSyncIntentionsInitializer
	| ItemParticipantsInitializer
	| KyselyMigrationInitializer
	| KyselyMigrationLockInitializer
	| ReceiptItemsInitializer
	| ReceiptParticipantsInitializer
	| ReceiptsInitializer
	| ResetPasswordIntentionsInitializer
	| SessionsInitializer
	| UsersInitializer;

interface InitializerTypeMap {
	accountConnectionsIntentions: AccountConnectionsIntentionsInitializer;
	accounts: AccountsInitializer;
	debts: DebtsInitializer;
	debtsSyncIntentions: DebtsSyncIntentionsInitializer;
	itemParticipants: ItemParticipantsInitializer;
	kysely_migration: KyselyMigrationInitializer;
	kysely_migration_lock: KyselyMigrationLockInitializer;
	receiptItems: ReceiptItemsInitializer;
	receiptParticipants: ReceiptParticipantsInitializer;
	receipts: ReceiptsInitializer;
	resetPasswordIntentions: ResetPasswordIntentionsInitializer;
	sessions: SessionsInitializer;
	users: UsersInitializer;
}

export type {
	AccountConnectionsIntentions,
	AccountConnectionsIntentionsInitializer,
	Accounts,
	AccountsInitializer,
	AccountsId,
	Debts,
	DebtsInitializer,
	DebtsId,
	DebtsSyncIntentions,
	DebtsSyncIntentionsInitializer,
	ItemParticipants,
	ItemParticipantsInitializer,
	KyselyMigration,
	KyselyMigrationInitializer,
	KyselyMigrationId,
	KyselyMigrationLock,
	KyselyMigrationLockInitializer,
	KyselyMigrationLockId,
	ReceiptItems,
	ReceiptItemsInitializer,
	ReceiptItemsId,
	ReceiptParticipants,
	ReceiptParticipantsInitializer,
	Receipts,
	ReceiptsInitializer,
	ReceiptsId,
	ResetPasswordIntentions,
	ResetPasswordIntentionsInitializer,
	Sessions,
	SessionsInitializer,
	SessionsId,
	Users,
	UsersInitializer,
	UsersId,
	Model,
	ModelTypeMap,
	ModelId,
	ModelIdTypeMap,
	Initializer,
	InitializerTypeMap,
};
