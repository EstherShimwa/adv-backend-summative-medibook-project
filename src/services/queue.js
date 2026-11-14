// Redis-backed queues, shared by the API and the worker.
//
// Every list is used as a FIFO: producers LPUSH on the left, consumers take from the right.
// Consumers never "pop and hope": they atomically MOVE an item to a matching
// ":processing" list (RPOPLPUSH) and only remove it once the work has succeeded.
// So an item is always in exactly one list and is never lost if a step fails or the worker crashes.
const KEYS = Object.freeze({
  jobs: 'medibook:jobs',
  jobsProcessing: 'medibook:jobs:processing',
  jobsFailed: 'medibook:jobs:failed',
  waitlistPattern: 'medibook:waitlist:*:*',
});

const JOB_TYPES = Object.freeze({ CONFIRMATION: 'confirmation', SLOT_FREED: 'slot-freed' });

let client = null;

function init(redisClient) {
  client = redisClient;
  return client;
}

function getClient() {
  if (!client) throw new Error('Queue client not initialised: call queue.init(redisClient) first');
  return client;
}

function waitlistKey(doctorId, date) {
  return `medibook:waitlist:${doctorId}:${date}`;
}

function processingKey(key) {
  return `${key}:processing`;
}

async function enqueueJob(type, payload) {
  const job = { type, payload, attempts: 0, enqueuedAt: new Date().toISOString() };
  await getClient().lpush(KEYS.jobs, JSON.stringify(job));
  return job;
}

// Adds a patient to the back of a doctor's waitlist for one day.
// Returns { added: false } if they are already waiting, otherwise { added: true, position }.
async function joinWaitlist({ patientId, doctorId, date, preferredTime }) {
  const redis = getClient();
  const key = waitlistKey(doctorId, date);
  const waiting = await getWaitlist(doctorId, date);
  if (waiting.some((entry) => entry.patientId === patientId)) {
    return { added: false, position: waiting.findIndex((e) => e.patientId === patientId) + 1 };
  }
  const entry = { patientId, doctorId, date, preferredTime: preferredTime || null, joinedAt: new Date().toISOString() };
  const length = await redis.lpush(key, JSON.stringify(entry));
  return { added: true, position: length, entry };
}

// Returns the waitlist in queue order (first in line first), including anyone mid-promotion.
async function getWaitlist(doctorId, date) {
  const redis = getClient();
  const key = waitlistKey(doctorId, date);
  const [waiting, inProgress] = await Promise.all([
    redis.lrange(key, 0, -1),
    redis.lrange(processingKey(key), 0, -1),
  ]);
  return [...inProgress, ...waiting.reverse()].map((raw) => JSON.parse(raw));
}

module.exports = {
  KEYS,
  JOB_TYPES,
  init,
  getClient,
  waitlistKey,
  processingKey,
  enqueueJob,
  joinWaitlist,
  getWaitlist,
};
