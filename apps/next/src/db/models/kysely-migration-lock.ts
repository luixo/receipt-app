// @generated
// Automatically generated. Don't change this file manually.

export type KyselyMigrationLockId = string & {
	" __flavor"?: "kysely_migration_lock";
};

export default interface KyselyMigrationLock {
	/** Primary key. Index: kysely_migration_lock_pkey */
	id: KyselyMigrationLockId;

	is_locked: number;
}

export interface KyselyMigrationLockInitializer {
	/** Primary key. Index: kysely_migration_lock_pkey */
	id: KyselyMigrationLockId;

	/** Default value: 0 */
	is_locked?: number;
}
