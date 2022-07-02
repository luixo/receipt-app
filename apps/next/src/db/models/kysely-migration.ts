// @generated
// Automatically generated. Don't change this file manually.

export type KyselyMigrationId = string & { " __flavor"?: "kysely_migration" };

export default interface KyselyMigration {
	/** Primary key. Index: kysely_migration_pkey */
	name: KyselyMigrationId;

	timestamp: string;
}

export interface KyselyMigrationInitializer {
	/** Primary key. Index: kysely_migration_pkey */
	name: KyselyMigrationId;

	timestamp: string;
}
