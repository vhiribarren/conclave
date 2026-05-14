/**
 * Key/Value storage layer backed by the Durable Object SQL API.
 *
 * Usage:
 *   const storage = new SqlKvStorage(ctx.storage.sql);
 *
 *   // On first access, check if data already exists:
 *   if (!storage.isInitialized()) {
 *     return new Response("Not found", { status: 404 });
 *   }
 *
 *   // Read/write when you know the store should exist:
 *   const store = storage.getOrCreateStore();
 *   const val = store.get<{ hello: string }>("myKey");
 *   store.put("myKey", { hello: "world" });
 */

/** Read/write access to an existing KV table. */
export class SqlKvStore {
  constructor(private readonly sql: SqlStorage, private readonly table: string) {}

  get<T>(key: string): T | undefined {
    const rows = this.sql.exec(`SELECT value FROM ${this.table} WHERE key = ?`, key).toArray();
    if (rows.length === 0) return undefined;
    return JSON.parse(rows[0]!.value as string) as T;
  }

  put(key: string, value: unknown): void {
    this.sql.exec(
      `INSERT OR REPLACE INTO ${this.table} (key, value) VALUES (?, ?)`,
      key,
      JSON.stringify(value)
    );
  }

  delete(key: string): void {
    this.sql.exec(`DELETE FROM ${this.table} WHERE key = ?`, key);
  }

  deleteAll(): void {
    this.sql.exec(`DELETE FROM ${this.table}`);
  }

  has(key: string): boolean {
    return this.sql.exec(`SELECT 1 FROM ${this.table} WHERE key = ?`, key).toArray().length > 0;
  }

  keys(): string[] {
    return [...this.sql.exec(`SELECT key FROM ${this.table}`)].map((row) => row.key as string);
  }
}

/** Factory that manages the lifecycle of a SQL-backed KV table. */
export class SqlKvStorage {
  private store: SqlKvStore | null = null;
  private readonly table: string;

  constructor(private readonly sql: SqlStorage, table: string = "kv") {
    if (!/^[a-zA-Z_]\w*$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    this.table = table;
  }

  /** Returns true if the backing table already exists (no side effects). */
  isInitialized(): boolean {
    if (this.store) return true;
    const rows = this.sql
      .exec(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`, this.table)
      .toArray();
    if (rows.length > 0) {
      this.store = new SqlKvStore(this.sql, this.table);
      return true;
    }
    return false;
  }

  /** Returns the KV store, creating the backing table if it doesn't exist yet. */
  getOrCreateStore(): SqlKvStore {
    if (this.store) return this.store;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS ${this.table} (key TEXT PRIMARY KEY, value TEXT)`
    );
    this.store = new SqlKvStore(this.sql, this.table);
    return this.store;
  }
}
