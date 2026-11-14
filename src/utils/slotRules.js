// Pure booking-time rules: no database, no Redis, so they can be unit-tested.
const {
  SLOT_MINUTES,
  WORKDAY_START_MINUTES,
  WORKDAY_END_MINUTES,
} = require('../config/constants');
const { parseLocalDateTime, toSqlDateTime, toSqlDate } = require('./datetime');

/**
 * Checks a requested appointment time.
 * Returns { ok: true, start, sqlDateTime, sqlDate }
 *      or { ok: false, status, message }  (400 = malformed input, 422 = breaks a business rule)
 */
function validateSlot(value, now = new Date()) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, status: 400, message: 'apptDatetime is required (format: YYYY-MM-DD HH:MM)' };
  }
  const start = parseLocalDateTime(value);
  if (!start) {
    return { ok: false, status: 400, message: 'apptDatetime must be a real date/time in the format YYYY-MM-DD HH:MM' };
  }
  if (start.getSeconds() !== 0 || start.getMinutes() % SLOT_MINUTES !== 0) {
    return { ok: false, status: 422, message: `Appointments start on a ${SLOT_MINUTES}-minute boundary (e.g. 09:00 or 09:30)` };
  }
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  if (startMinutes < WORKDAY_START_MINUTES || startMinutes + SLOT_MINUTES > WORKDAY_END_MINUTES) {
    return { ok: false, status: 422, message: 'Appointments must be within working hours (09:00-17:00); the last slot starts at 16:30' };
  }
  if (start.getTime() <= now.getTime()) {
    return { ok: false, status: 422, message: 'Appointments can only be booked in the future' };
  }
  return { ok: true, start, sqlDateTime: toSqlDateTime(start), sqlDate: toSqlDate(start) };
}

module.exports = { validateSlot };
