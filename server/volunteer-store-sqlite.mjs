// Local volunteer storage for `npm run dev`: one SQLite file in the data directory.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function sqliteStore(dataDirectory) {
  mkdirSync(dataDirectory, { recursive: true })
  const db = new DatabaseSync(join(dataDirectory, 'volunteers.sqlite'))
  db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS kv (hash TEXT NOT NULL, field TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (hash, field))')
  const get = db.prepare('SELECT value FROM kv WHERE hash = ? AND field = ?')
  const set = db.prepare('INSERT INTO kv (hash, field, value) VALUES (?, ?, ?) ON CONFLICT (hash, field) DO UPDATE SET value = excluded.value')
  const add = db.prepare('INSERT OR IGNORE INTO kv (hash, field, value) VALUES (?, ?, ?)')
  const list = db.prepare('SELECT field, value FROM kv WHERE hash = ?')
  return {
    async hget(hash, field) { return get.get(hash, field)?.value ?? null },
    async hset(hash, field, value) { set.run(hash, field, value) },
    async hsetnx(hash, field, value) { return add.run(hash, field, value).changes > 0 },
    async hgetall(hash) { return Object.fromEntries(list.all(hash).map(row => [row.field, row.value])) },
    close() { db.close() },
  }
}
