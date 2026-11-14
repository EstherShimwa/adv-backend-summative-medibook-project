const { pool } = require('../config/db');

// Every doctor (LEFT JOIN keeps doctors with zero appointments) with totals.
async function getDoctorsReport() {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctorId,
            d.full_name AS fullName,
            d.specialty,
            COUNT(a.id) AS totalAppointments,
            COALESCE(SUM(a.status = 'BOOKED'), 0) AS activeAppointments,
            COALESCE(SUM(a.status = 'CANCELLED'), 0) AS cancelledAppointments,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenueCollected
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.full_name, d.specialty
      ORDER BY revenueCollected DESC, d.id`
  );
  return rows;
}

// Every (doctor, date) where MORE than threshold x cap slots are booked.
async function getBusyDays(dailyCap, threshold) {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctorId,
            d.full_name AS fullName,
            DATE(a.appt_datetime) AS date,
            COUNT(*) AS bookedSlots,
            ? AS dailyCapacity,
            ROUND(COUNT(*) / ? * 100, 1) AS utilizationPercent
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.status = 'BOOKED'
      GROUP BY d.id, d.full_name, DATE(a.appt_datetime)
     HAVING COUNT(*) > ? * ?
      ORDER BY date, d.id`,
    [dailyCap, dailyCap, dailyCap, threshold]
  );
  return rows;
}

module.exports = { getDoctorsReport, getBusyDays };
