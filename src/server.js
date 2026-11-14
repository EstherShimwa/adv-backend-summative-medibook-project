const { port } = require('./config/env');
const { pool } = require('./config/db');
const { createApiClient } = require('./config/redis');
const queue = require('./services/queue');
const app = require('./app');

const redis = queue.init(createApiClient());
redis.on('error', (err) => console.error(`[redis] ${err.message}`));

async function start() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('Connected to MySQL');
  } catch (err) {
    console.error(`Could not connect to MySQL: ${err.message}. Check your .env settings.`);
    process.exit(1);
  }
  app.listen(port, () => console.log(`MediBook API listening on http://localhost:${port}`));
}

start();
