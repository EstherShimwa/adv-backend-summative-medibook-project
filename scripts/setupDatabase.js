// Runs database/schema.sql then database/seed.sql (handy on Windows where `mysql` may not be on PATH).
// Usage: npm run db:setup
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../src/config/env');
const { pool, localUtcOffset } = require('../src/config/db');

async function runFile(connection, file) {
  const sql = await fs.readFile(path.join(__dirname, '..', 'database', file), 'utf8');
  await connection.query(sql);
  console.log(`Ran database/${file}`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    multipleStatements: true,
  });
  try {
    await connection.query('SET time_zone = ?', [localUtcOffset()]);
    await runFile(connection, 'schema.sql');
    await runFile(connection, 'seed.sql');
    console.log('Database "medibook" is ready.');
  } finally {
    await connection.end();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Database setup failed: ${err.message}`);
  process.exit(1);
});
