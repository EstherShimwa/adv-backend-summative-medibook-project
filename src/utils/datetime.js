// Pure date helpers. All clinic times are local wall-clock times ("YYYY-MM-DD HH:MM[:SS]").
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_HOUR = 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

// Returns a Date for a valid local datetime string, or null if malformed / impossible (e.g. Feb 30).
function parseLocalDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = DATETIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(year, month - 1, day, hour, minute, second);
  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second;
  return roundTrips ? date : null;
}

function isValidDateOnly(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  return parseLocalDateTime(`${value} 00:00`) !== null;
}

function toSqlDateTime(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function toSqlDate(date) {
  return toSqlDateTime(date).slice(0, 10);
}

function hoursBetween(from, to) {
  return (to.getTime() - from.getTime()) / MS_PER_HOUR;
}

module.exports = { parseLocalDateTime, isValidDateOnly, toSqlDateTime, toSqlDate, hoursBetween };
