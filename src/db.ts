import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { config } from './config.js'

const db: DatabaseType = new Database(config.dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS loan_index (
    id TEXT PRIMARY KEY,
    borrower TEXT NOT NULL,
    due_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_loan_index_due
    ON loan_index(due_at);

  CREATE TABLE IF NOT EXISTS lender_index (
    address TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lender_snapshots (
    loan_id TEXT NOT NULL,
    lender_address TEXT NOT NULL,
    deposit_amount INTEGER NOT NULL,
    total_deposits INTEGER NOT NULL,
    distributed INTEGER DEFAULT 0,
    PRIMARY KEY (loan_id, lender_address)
  );

  CREATE TABLE IF NOT EXISTS pending_distributions (
    loan_id TEXT PRIMARY KEY,
    interest_amount INTEGER NOT NULL,
    distributed INTEGER DEFAULT 0
  );
`)

export { db }
