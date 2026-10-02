-- TraktiRie — Turso (libSQL/SQLite) schema
-- Jalankan sekali di awal:  turso db shell traktirie < db/schema.sql

CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,          -- Supabase auth user id (uuid)
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  display_name  TEXT,
  bio           TEXT DEFAULT '',
  role          TEXT DEFAULT 'creator',    -- 'creator' | 'admin'
  avatar_url    TEXT DEFAULT '',
  provider      TEXT DEFAULT 'email',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id                   TEXT PRIMARY KEY REFERENCES profiles(id),
  balance                   INTEGER NOT NULL DEFAULT 0,
  last_subscription_check   TEXT
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL,               -- topup | withdraw | withdraw_refund | subscription_fee
  amount      INTEGER NOT NULL,
  status      TEXT NOT NULL,
  note        TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES profiles(id),
  type            TEXT,                    -- ewallet | bank
  channel         TEXT,
  account_number  TEXT,
  account_name    TEXT,
  amount          INTEGER,
  fee             INTEGER,
  total           INTEGER,
  status          TEXT DEFAULT 'pending',
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_wallet (
  id       INTEGER PRIMARY KEY CHECK (id = 1),
  balance  INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO admin_wallet (id, balance) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS store_settings (
  owner_id     TEXT PRIMARY KEY REFERENCES profiles(id),
  name         TEXT,
  tagline      TEXT DEFAULT 'Digital store di TraktiRie',
  avatar_seed  TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES profiles(id),
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT DEFAULT '',
  price          INTEGER NOT NULL DEFAULT 0,
  icon           TEXT DEFAULT 'box',
  type           TEXT DEFAULT 'link',
  download_link  TEXT DEFAULT '',
  delivery_note  TEXT DEFAULT '',
  image_url      TEXT DEFAULT '',
  created_at     TEXT DEFAULT (datetime('now')),
  UNIQUE (owner_id, code)
);

CREATE TABLE IF NOT EXISTS shop_purchases (
  id              TEXT PRIMARY KEY,
  owner_id        TEXT NOT NULL REFERENCES profiles(id),
  buyer_contact   TEXT,
  product_code    TEXT,
  amount          INTEGER,
  status          TEXT DEFAULT 'success',
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commission_settings (
  owner_id     TEXT PRIMARY KEY REFERENCES profiles(id),
  is_open      INTEGER NOT NULL DEFAULT 1,
  title        TEXT DEFAULT 'Open Commission',
  description  TEXT DEFAULT '',
  types_json   TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS commission_orders (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES profiles(id),
  buyer_name     TEXT,
  buyer_contact  TEXT,
  type_id        TEXT,
  type_name      TEXT,
  price          INTEGER,
  detail_json    TEXT DEFAULT '{}',
  status         TEXT DEFAULT 'pending',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wa_config (
  owner_id       TEXT PRIMARY KEY REFERENCES profiles(id),
  status         TEXT DEFAULT 'disconnected',
  paired         INTEGER DEFAULT 0,
  pairing_code   TEXT,
  phone          TEXT,
  last_paired    TEXT
);

CREATE TABLE IF NOT EXISTS linkbio_config (
  owner_id     TEXT PRIMARY KEY REFERENCES profiles(id),
  config_json  TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS theme_config (
  owner_id     TEXT NOT NULL REFERENCES profiles(id),
  scope        TEXT NOT NULL,              -- 'linkbio' | 'shop'
  config_json  TEXT DEFAULT '{}',
  PRIMARY KEY (owner_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_orders_owner ON commission_orders(owner_id);
