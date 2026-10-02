const { createClient } = require('@libsql/client');

let _client = null;

/** Shared Turso connection (reused across requests). */
function getDb() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN is not set in environment variables.');
    }
    _client = createClient({ url, authToken });
  }
  return _client;
}

function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { getDb, newId };
