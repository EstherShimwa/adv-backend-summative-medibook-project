const Redis = require('ioredis');
const { redis } = require('./env');

// API process: fail fast instead of hanging a request when Redis is down.
function createApiClient() {
  return new Redis({
    host: redis.host,
    port: redis.port,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
}

// Worker process: keep retrying until Redis comes back.
function createWorkerClient() {
  return new Redis({ host: redis.host, port: redis.port, maxRetriesPerRequest: null });
}

module.exports = { createApiClient, createWorkerClient };
