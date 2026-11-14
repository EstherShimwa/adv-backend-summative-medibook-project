// Background worker: a SEPARATE process from the web server (run with `npm run worker`).
// It processes two kinds of jobs from Redis:
//   - confirmation: writes the confirmation SMS/email to the audit log
//   - slot-freed:   books the first waitlisted patient into the freed slot
const { createWorkerClient } = require('./config/redis');
const { pool } = require('./config/db');
const queue = require('./services/queue');
const bookingService = require('./services/bookingService');
const AppError = require('./utils/AppError');
const { audit } = require('./utils/auditLogger');
const {
  JOB_MAX_ATTEMPTS,
  JOB_RETRY_DELAY_MS,
  WORKER_BLOCK_TIMEOUT_SECONDS,
} = require('./config/constants');

const { KEYS, JOB_TYPES } = queue;
const redis = queue.init(createWorkerClient());
const blockingRedis = redis.duplicate(); // a blocking pop ties up its connection
let running = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- job handlers ---------------------------------------------------------

async function sendConfirmation(payload) {
  const when = payload.apptDatetime.slice(0, 16);
  const message =
    `Hi ${payload.patientName}, your appointment with ${payload.doctorName} ` +
    `on ${when} in room ${payload.room} is confirmed. Ref #${payload.appointmentId}.`;
  await audit('CONFIRMATION_SENT', {
    appointmentId: payload.appointmentId,
    sms: { to: payload.patientPhone, message },
    email: { to: payload.patientEmail, subject: 'Appointment confirmed', message },
  });
}

// Business-rule failures (AppError) mean "this patient cannot take this slot right now".
// Anything else (database down, network error) is temporary, so the job is retried.
async function promoteFromWaitlist({ doctorId, apptDatetime }) {
  const date = apptDatetime.slice(0, 10);
  const key = queue.waitlistKey(doctorId, date);
  const inProgress = queue.processingKey(key);

  // Atomically move the first patient in line to the processing list.
  // From here on they are always in one of the two lists, never in neither.
  const raw = await redis.rpoplpush(key, inProgress);
  if (!raw) {
    console.log(`[worker] slot ${apptDatetime} freed for doctor ${doctorId}: waitlist empty`);
    return;
  }
  const entry = JSON.parse(raw);

  try {
    const appointment = await bookingService.bookAppointment(
      { patientId: entry.patientId, doctorId, apptDatetime },
      { source: 'waitlist' }
    );
    await redis.lrem(inProgress, 1, raw); // booked: now it is safe to remove them
    await audit('WAITLIST_PROMOTED', { patientId: entry.patientId, doctorId, appointmentId: appointment.id, apptDatetime });
    console.log(`[worker] promoted patient ${entry.patientId} into appointment #${appointment.id}`);
  } catch (err) {
    if (err instanceof AppError && err.details?.code === 'PATIENT_NOT_FOUND') {
      // The patient record was deleted while waiting: nobody to book, so drop the entry.
      await redis.lrem(inProgress, 1, raw);
      await audit('WAITLIST_ENTRY_DROPPED', { patientId: entry.patientId, doctorId, date, reason: err.message });
      return;
    }
    // Put the patient back at the FRONT of the line (the right end is the consumer end).
    await redis.multi().lrem(inProgress, 1, raw).rpush(key, raw).exec();
    await audit('WAITLIST_PROMOTION_FAILED', {
      patientId: entry.patientId,
      doctorId,
      apptDatetime,
      reason: err.message,
      patientKeptOnWaitlist: true,
    });
    if (!(err instanceof AppError)) throw err; // temporary failure: let the job be retried
  }
}

const HANDLERS = {
  [JOB_TYPES.CONFIRMATION]: sendConfirmation,
  [JOB_TYPES.SLOT_FREED]: promoteFromWaitlist,
};

// ---- queue mechanics ------------------------------------------------------

async function handleRawJob(raw) {
  let job;
  try {
    job = JSON.parse(raw);
  } catch {
    await redis.multi().lrem(KEYS.jobsProcessing, 1, raw).lpush(KEYS.jobsFailed, raw).exec();
    return;
  }

  try {
    const handler = HANDLERS[job.type];
    if (!handler) throw new Error(`Unknown job type "${job.type}"`);
    await handler(job.payload);
    await redis.lrem(KEYS.jobsProcessing, 1, raw);
  } catch (err) {
    const attempts = job.attempts + 1;
    const retry = { ...job, attempts, lastError: err.message };
    if (attempts < JOB_MAX_ATTEMPTS) {
      console.warn(`[worker] ${job.type} job failed (attempt ${attempts}), retrying: ${err.message}`);
      await sleep(JOB_RETRY_DELAY_MS);
      await redis.multi().lrem(KEYS.jobsProcessing, 1, raw).lpush(KEYS.jobs, JSON.stringify(retry)).exec();
    } else {
      console.error(`[worker] ${job.type} job failed ${attempts} times, moved to ${KEYS.jobsFailed}`);
      await redis.multi().lrem(KEYS.jobsProcessing, 1, raw).lpush(KEYS.jobsFailed, JSON.stringify(retry)).exec();
      await audit('JOB_FAILED', { jobType: job.type, payload: job.payload, error: err.message });
    }
  }
}

// If the worker crashed mid-job last time, put unfinished work back where it came from.
async function recoverUnfinishedWork() {
  const unfinishedJobs = await redis.lrange(KEYS.jobsProcessing, 0, -1);
  for (const raw of unfinishedJobs) {
    await redis.multi().lrem(KEYS.jobsProcessing, 1, raw).rpush(KEYS.jobs, raw).exec();
  }

  const waitlistProcessingKeys = await redis.keys(`${KEYS.waitlistPattern}:processing`);
  for (const inProgress of waitlistProcessingKeys) {
    const waitlist = inProgress.replace(/:processing$/, '');
    for (const raw of await redis.lrange(inProgress, 0, -1)) {
      await redis.multi().lrem(inProgress, 1, raw).rpush(waitlist, raw).exec();
    }
  }
  if (unfinishedJobs.length || waitlistProcessingKeys.length) {
    console.log('[worker] recovered unfinished work from a previous run');
  }
}

async function run() {
  await recoverUnfinishedWork();
  console.log('[worker] waiting for jobs...');
  while (running) {
    let raw;
    try {
      raw = await blockingRedis.brpoplpush(KEYS.jobs, KEYS.jobsProcessing, WORKER_BLOCK_TIMEOUT_SECONDS);
    } catch (err) {
      if (!running) break; // connection closed because we are shutting down
      throw err;
    }
    if (raw) await handleRawJob(raw);
  }
}

async function shutdown() {
  console.log('[worker] shutting down...');
  running = false;
  blockingRedis.disconnect();
  await redis.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
