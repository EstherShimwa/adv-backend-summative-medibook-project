const { calculateRefund, refundPercentForNotice } = require('../src/utils/refund');

// Fixed dates: the appointment is always at 10:00 on 10 Dec 2026 (local time).
const APPOINTMENT = new Date(2026, 11, 10, 10, 0, 0);
const HOUR = 60 * 60 * 1000;
const cancelledHoursBefore = (hours) => new Date(APPOINTMENT.getTime() - hours * HOUR);

describe('calculateRefund (policy: >48h = 100%, 24h-48h = 50%, <24h = 0%)', () => {
  test('more than 48 hours notice gives a full refund', () => {
    const result = calculateRefund(150, APPOINTMENT, cancelledHoursBefore(72));
    expect(result.refundPercent).toBe(100);
    expect(result.refundAmount).toBe(150);
  });

  test('exactly 48 hours notice is NOT "more than 48", so it gives 50%', () => {
    const result = calculateRefund(150, APPOINTMENT, cancelledHoursBefore(48));
    expect(result.noticeHours).toBe(48);
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(75);
  });

  test('one minute more than 48 hours gives a full refund', () => {
    const result = calculateRefund(150, APPOINTMENT, new Date(cancelledHoursBefore(48).getTime() - 60 * 1000));
    expect(result.refundPercent).toBe(100);
  });

  test('between 24 and 48 hours notice gives 50%', () => {
    const result = calculateRefund(100, APPOINTMENT, cancelledHoursBefore(36));
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(50);
  });

  test('exactly 24 hours notice is inside the 24-48h tier, so it gives 50%', () => {
    const result = calculateRefund(100, APPOINTMENT, cancelledHoursBefore(24));
    expect(result.noticeHours).toBe(24);
    expect(result.refundPercent).toBe(50);
    expect(result.refundAmount).toBe(50);
  });

  test('one minute less than 24 hours gives no refund', () => {
    const result = calculateRefund(100, APPOINTMENT, new Date(cancelledHoursBefore(24).getTime() + 60 * 1000));
    expect(result.refundPercent).toBe(0);
    expect(result.refundAmount).toBe(0);
  });

  test('less than 24 hours notice gives no refund', () => {
    const result = calculateRefund(100, APPOINTMENT, cancelledHoursBefore(2));
    expect(result.refundPercent).toBe(0);
    expect(result.refundAmount).toBe(0);
  });

  test('refund amounts are rounded to whole cents', () => {
    expect(calculateRefund(99.99, APPOINTMENT, cancelledHoursBefore(30)).refundAmount).toBe(50);
    expect(calculateRefund('120.50', APPOINTMENT, cancelledHoursBefore(30)).refundAmount).toBe(60.25);
  });

  test('refundPercentForNotice maps hours to the right tier', () => {
    expect([49, 48, 47, 24, 23.99, 0].map(refundPercentForNotice)).toEqual([100, 50, 50, 50, 0, 0]);
  });
});
