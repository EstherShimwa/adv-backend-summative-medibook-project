// Pure refund calculator: the server decides the refund, never the client.
const {
  FULL_REFUND_MIN_NOTICE_HOURS,
  PARTIAL_REFUND_MIN_NOTICE_HOURS,
  FULL_REFUND_PERCENT,
  PARTIAL_REFUND_PERCENT,
  NO_REFUND_PERCENT,
} = require('../config/constants');
const { hoursBetween } = require('./datetime');

// Policy: > 48h -> 100%, 24h..48h inclusive -> 50%, < 24h -> 0%.
function refundPercentForNotice(noticeHours) {
  if (noticeHours > FULL_REFUND_MIN_NOTICE_HOURS) return FULL_REFUND_PERCENT;
  if (noticeHours >= PARTIAL_REFUND_MIN_NOTICE_HOURS) return PARTIAL_REFUND_PERCENT;
  return NO_REFUND_PERCENT;
}

/**
 * @param {number} amountPaid      what the patient paid
 * @param {Date}   appointmentAt   when the appointment starts
 * @param {Date}   cancelledAt     when the cancellation happens
 * @returns {{ noticeHours: number, refundPercent: number, refundAmount: number }}
 */
function calculateRefund(amountPaid, appointmentAt, cancelledAt) {
  const noticeHours = hoursBetween(cancelledAt, appointmentAt);
  const refundPercent = refundPercentForNotice(noticeHours);
  // Work in whole cents to avoid floating-point money errors.
  const paidCents = Math.round(Number(amountPaid) * 100);
  const refundAmount = Math.round((paidCents * refundPercent) / 100) / 100;
  return { noticeHours, refundPercent, refundAmount };
}

module.exports = { calculateRefund, refundPercentForNotice };
