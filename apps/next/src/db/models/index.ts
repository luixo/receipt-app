// @generated
// Automatically generated. Don't change this file manually.

import AccountConnectionsIntentions, {
	AccountConnectionsIntentionsInitializer,
} from "./account-connections-intentions";
import Accounts, { AccountsInitializer, AccountsId } from "./accounts";
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
import Sessions, { SessionsInitializer, SessionsId } from "./sessions";
import Users, { UsersInitializer, UsersId } from "./users";

type Model =
	| AccountConnectionsIntentions
	| Accounts
	| ItemParticipants
	| KyselyMigration
	| KyselyMigrationLock
	| ReceiptItems
	| ReceiptParticipants
	| Receipts
	| Sessions
	| Users;

interface ModelTypeMap {
	accountConnectionsIntentions: AccountConnectionsIntentions;
	accounts: Accounts;
	item_participants: ItemParticipants;
	kysely_migration: KyselyMigration;
	kysely_migration_lock: KyselyMigrationLock;
	receipt_items: ReceiptItems;
	receipt_participants: ReceiptParticipants;
	receipts: Receipts;
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
	| UsersId;

interface ModelIdTypeMap {
	accounts: AccountsId;
	kysely_migration: KyselyMigrationId;
	kysely_migration_lock: KyselyMigrationLockId;
	receipt_items: ReceiptItemsId;
	receipts: ReceiptsId;
	sessions: SessionsId;
	users: UsersId;
}

type Initializer =
	| AccountConnectionsIntentionsInitializer
	| AccountsInitializer
	| ItemParticipantsInitializer
	| KyselyMigrationInitializer
	| KyselyMigrationLockInitializer
	| ReceiptItemsInitializer
	| ReceiptParticipantsInitializer
	| ReceiptsInitializer
	| SessionsInitializer
	| UsersInitializer;

interface InitializerTypeMap {
	accountConnectionsIntentions: AccountConnectionsIntentionsInitializer;
	accounts: AccountsInitializer;
	item_participants: ItemParticipantsInitializer;
	kysely_migration: KyselyMigrationInitializer;
	kysely_migration_lock: KyselyMigrationLockInitializer;
	receipt_items: ReceiptItemsInitializer;
	receipt_participants: ReceiptParticipantsInitializer;
	receipts: ReceiptsInitializer;
	sessions: SessionsInitializer;
	users: UsersInitializer;
}

export type {
	AccountConnectionsIntentions,
	AccountConnectionsIntentionsInitializer,
	Accounts,
	AccountsInitializer,
	AccountsId,
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
