import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { QueryResultRow } from 'pg';
import { isPostgresDatabase, query, runMigration, withTransaction } from './client.js';

export interface AppliedMigrationRow extends QueryResultRow {
  name: string;
  checksum: string;
}

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}

export interface ApplyMigrationsOptions {
  directory?: string;
}

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');
// The newsletter table stays Supabase/Postgres-backed, so self-hosted SQLite
// skips the policy migration instead of trying to replay a server-only feature.
const SQLITE_INCOMPATIBLE_MIGRATIONS = new Set(['007_newsletter_unsubscribe.sql']);
// 004 was republished with managed_nodes.updated_at after v0.2.99. Allow the
// original checksum to keep older databases on the upgrade path.
const LEGACY_COMPATIBLE_MIGRATION_CHECKSUMS = new Map<string, Set<string>>([
  ['004_cig_node_onboarding.sql', new Set(['799a1b3f'])],
]);

export function resolveMigrationsDirectory(directory?: string): string {
  return directory ? path.resolve(directory) : DEFAULT_MIGRATIONS_DIR;
}

export async function listMigrationFiles(directory?: string): Promise<string[]> {
  const migrationsDir = resolveMigrationsDirectory(directory);
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export async function ensureSchemaMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name         TEXT PRIMARY KEY,
      checksum     TEXT NOT NULL,
      applied_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function buildChecksum(sql: string): string {
  let hash = 0;
  for (let index = 0; index < sql.length; index += 1) {
    hash = (hash * 31 + sql.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function isLegacyCompatibleMigration(fileName: string, checksum: string): boolean {
  return LEGACY_COMPATIBLE_MIGRATION_CHECKSUMS.get(fileName)?.has(checksum) ?? false;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  if (isPostgresDatabase()) {
    const result = await query<{ column_exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_name = $2
      ) AS column_exists
      `,
      [tableName, columnName]
    );

    return result.rows[0]?.column_exists ?? false;
  }

  const result = await query<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return result.rows.some((row) => row.name === columnName);
}

async function prepareLegacyUsersTableIfNeeded(
  executor: typeof query
): Promise<void> {
  if (!isPostgresDatabase()) {
    return;
  }

  const legacyUsersTable = await executor<{ exists: boolean }>(
    "SELECT to_regclass('public.users') IS NOT NULL AS exists"
  );

  if (!legacyUsersTable.rows[0]?.exists) {
    return;
  }

  await executor('ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_sub TEXT');
  await executor('ALTER TABLE users ADD COLUMN IF NOT EXISTS groups TEXT');
  await executor('UPDATE users SET oidc_sub = sub WHERE oidc_sub IS NULL AND sub IS NOT NULL');
  await executor("UPDATE users SET groups = '[]' WHERE groups IS NULL");
}

export async function applyMigrations(
  options: ApplyMigrationsOptions = {}
): Promise<MigrationRunResult> {
  const migrationsDir = resolveMigrationsDirectory(options.directory);
  const migrationFiles = await listMigrationFiles(migrationsDir);
  const applied: string[] = [];
  const skipped: string[] = [];
  const usesPostgres = isPostgresDatabase();
  const selectMigrationSql = usesPostgres
    ? 'SELECT name, checksum FROM schema_migrations WHERE name = $1'
    : 'SELECT name, checksum FROM schema_migrations WHERE name = ?';
  const insertMigrationSql = usesPostgres
    ? 'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)'
    : 'INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)';

  await ensureSchemaMigrationsTable();

  for (const fileName of migrationFiles) {
    if (!usesPostgres && SQLITE_INCOMPATIBLE_MIGRATIONS.has(fileName)) {
      continue;
    }

    const fullPath = path.join(migrationsDir, fileName);
    const sql = await readFile(fullPath, 'utf8');
    const checksum = buildChecksum(sql);

    const existing = await query<AppliedMigrationRow>(selectMigrationSql, [fileName]);

    if (existing.rowCount > 0) {
      const appliedMigration = existing.rows[0]!;
      if (appliedMigration.checksum !== checksum) {
        if (isLegacyCompatibleMigration(fileName, appliedMigration.checksum)) {
          skipped.push(fileName);
          continue;
        }
        throw new Error(
          `Migration checksum mismatch for ${fileName}. Existing checksum ${appliedMigration.checksum} does not match ${checksum}.`
        );
      }
      skipped.push(fileName);
      continue;
    }

    if (
      fileName === '008_managed_nodes_updated_at.sql' &&
      (await columnExists('managed_nodes', 'updated_at'))
    ) {
      skipped.push(fileName);
      continue;
    }

    if (
      fileName === '012_analytics_public_maintenance.sql' &&
      (await columnExists('analytics_sites', 'public_share_paused'))
    ) {
      skipped.push(fileName);
      continue;
    }

    if (
      fileName === '013_analytics_public_alias.sql' &&
      (await columnExists('analytics_sites', 'public_share_alias')) &&
      (await columnExists('analytics_sites', 'public_share_base_domain'))
    ) {
      skipped.push(fileName);
      continue;
    }

    await withTransaction(async (txQuery) => {
      if (fileName === '001_auth_provisioning.sql') {
        await prepareLegacyUsersTableIfNeeded(txQuery);
      }

      await runMigration(sql, txQuery);

      await txQuery(insertMigrationSql, [fileName, checksum]);
    });

    applied.push(fileName);
  }

  return { applied, skipped };
}
