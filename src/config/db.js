const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATETIME/DATE as 'YYYY-MM-DD HH:MM:SS' strings so no timezone
  // conversion happens between Node and MySQL. The clinic works in local time.
  dateStrings: true,
  decimalNumbers: true,
});

// Make MySQL's NOW()/CURDATE() use the same local time as Node, so "future",
// "today" and "upcoming" mean the same thing in JavaScript and in SQL.
function localUtcOffset() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

pool.on('connection', (connection) => {
  connection.query('SET time_zone = ?', [localUtcOffset()]);
});

// Runs `work(connection)` inside a transaction: commit on success, rollback on any error.
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { pool, withTransaction, localUtcOffset };
