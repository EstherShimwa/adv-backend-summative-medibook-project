// Every business value is defined once, here.
module.exports = Object.freeze({
  SLOT_MINUTES: 30,
  WORKDAY_START_MINUTES: 9 * 60, // 09:00, first slot starts
  WORKDAY_END_MINUTES: 17 * 60, // 17:00, last slot must END by then (so starts at 16:30)
  MAX_APPOINTMENTS_PER_DAY: 12,

  // Refund policy (hours of notice before the appointment):
  //   notice > 48h          -> 100%
  //   24h <= notice <= 48h  -> 50%   (both exact boundaries fall in this tier)
  //   notice < 24h          -> 0%
  FULL_REFUND_MIN_NOTICE_HOURS: 48,
  PARTIAL_REFUND_MIN_NOTICE_HOURS: 24,
  FULL_REFUND_PERCENT: 100,
  PARTIAL_REFUND_PERCENT: 50,
  NO_REFUND_PERCENT: 0,

  STATS_WINDOW_DAYS: 7,
  BUSY_DAY_THRESHOLD: 0.8, // a day is "busy" when MORE than 80% of the cap is booked

  APPOINTMENT_STATUS: Object.freeze({ BOOKED: 'BOOKED', CANCELLED: 'CANCELLED' }),

  JOB_MAX_ATTEMPTS: 3,
  JOB_RETRY_DELAY_MS: 2000,
  WORKER_BLOCK_TIMEOUT_SECONDS: 5,
});
