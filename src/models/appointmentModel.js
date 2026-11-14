const { pool } = require('../config/db');

const DETAIL_COLUMNS = `
  a.id,
  a.appt_datetime AS apptDatetime,
  a.status,
  a.amount_paid AS amountPaid,
  a.booked_on AS bookedOn,
  a.cancelled_at AS cancelledAt,
  a.refund_percent AS refundPercent,
  a.refund_amount AS refundAmount,
  p.id AS patientId, p.full_name AS patientName, p.email AS patientEmail, p.phone AS patientPhone,
  d.id AS doctorId, d.full_name AS doctorName, d.specialty, d.room`;

async function findById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${DETAIL_COLUMNS}
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN doctors d ON d.id = a.doctor_id
      WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

// Locks the appointment row for the rest of the transaction (used when cancelling).
async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT id, doctor_id AS doctorId, patient_id AS patientId, appt_datetime AS apptDatetime,
            amount_paid AS amountPaid, status
       FROM appointments WHERE id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function countActiveForDoctorOnDate(connection, doctorId, date) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'BOOKED'
        AND appt_datetime >= ?
        AND appt_datetime < ? + INTERVAL 1 DAY`,
    [doctorId, date, date]
  );
  return Number(rows[0].total);
}

async function insert(connection, { patientId, doctorId, apptDatetime, amountPaid }) {
  const [result] = await connection.execute(
    'INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES (?, ?, ?, ?)',
    [patientId, doctorId, apptDatetime, amountPaid]
  );
  return result.insertId;
}

// Cancellation and refund are written in ONE statement on the same row,
// so they can only succeed or fail together.
async function markCancelled(connection, id, { cancelledAt, refundPercent, refundAmount }) {
  const [result] = await connection.execute(
    `UPDATE appointments
        SET status = 'CANCELLED', cancelled_at = ?, refund_percent = ?, refund_amount = ?
      WHERE id = ? AND status = 'BOOKED'`,
    [cancelledAt, refundPercent, refundAmount, id]
  );
  return result.affectedRows === 1;
}

module.exports = { findById, findByIdForUpdate, countActiveForDoctorOnDate, insert, markCancelled };
