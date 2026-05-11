/**
 * Key/Value storage layer backed by the Durable Object SQL API.
 *
 * Creates a table on first use and exposes get/put/delete operations
 * that serialize values as JSON, mimicking the legacy KV storage API.
 *
 * Usage:
 *   const kv = new SqlKvStorage(ctx.storage.sql);
 *   kv.put("myKey", { hello: "world" });
 *   const val = kv.get<{ hello: string }>("myKey");
 *
 *   // With custom table name:
 *   const kv = new SqlKvStorage(ctx.storage.sql, "settings");
 */

export class SqlKvStorage {
  private initialized = false;
  private readonly table: string;

  constructor(private readonly sql: SqlStorage, table: string = "kv") {
    if (!/^[a-zA-Z_]\w*$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    this.table = table;
  }

  private ensureTable(): void {
    if (this.initialized) return;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS ${this.table} (key TEXT PRIMARY KEY, value TEXT)`
    );
    this.initialized = true;
  }

  get<T>(key: string): T | undefined {
    this.ensureTable();
    const rows = this.sql.exec(`SELECT value FROM ${this.table} WHERE key = ?`, key).toArray();
    if (rows.length === 0) return undefined;
    return JSON.parse(rows[0]!.value as string) as T;
  }

  put(key: string, value: unknown): void {
    this.ensureTable();
    this.sql.exec(
      `INSERT OR REPLACE INTO ${this.table} (key, value) VALUES (?, ?)`,
      key,
      JSON.stringify(value)
    );
  }

  delete(key: string): void {
    this.ensureTable();
    this.sql.exec(`DELETE FROM ${this.table} WHERE key = ?`, key);
  }

  deleteAll(): void {
    this.ensureTable();
    this.sql.exec(`DELETE FROM ${this.table}`);
  }

  has(key: string): boolean {
    this.ensureTable();
    const rows = this.sql
      .exec(`SELECT 1 FROM ${this.table} WHERE key = ?`, key)
      .toArray();
    return rows.length > 0;
  }

  keys(): string[] {
    this.ensureTable();
    const cursor = this.sql.exec(`SELECT key FROM ${this.table}`);
    return [...cursor].map((row) => row.key as string);
  }
}
