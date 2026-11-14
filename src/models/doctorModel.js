const { pool } = require('../config/db');

const COLUMNS =
  'id, full_name AS fullName, specialty, consultation_fee AS consultationFee, room, created_at AS createdAt';

async function findAll() {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM doctors ORDER BY id`);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM doctors WHERE id = ?`, [id]);
  return rows[0] || null;
}

// Locks the doctor's row until the surrounding transaction ends. Every booking for
// this doctor must take the same lock, so bookings for one doctor run one at a time.
async function findByIdForUpdate(connection, id) {
  const [rows] = await connection.execute(`SELECT ${COLUMNS} FROM doctors WHERE id = ? FOR UPDATE`, [id]);
  return rows[0] || null;
}

async function create({ fullName, specialty, consultationFee, room }) {
  const [result] = await pool.execute(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [fullName, specialty, consultationFee, room]
  );
  return findById(result.insertId);
}

async function update(id, { fullName, specialty, consultationFee, room }) {
  const [result] = await pool.execute(
    'UPDATE doctors SET full_name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE id = ?',
    [fullName, specialty, consultationFee, room, id]
  );
  return result.affectedRows === 0 ? null : findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM doctors WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Revenue collected and upcoming count, computed by SQL.
// Revenue = what was paid minus what was refunded (cancelled bookings keep any non-refunded part).
async function getSummaryStats(id) {
  const [rows] = await pool.execute(
    `SELECT d.id AS doctorId,
            d.full_name AS fullName,
            COALESCE(SUM(a.amount_paid - COALESCE(a.refund_amount, 0)), 0) AS revenueCollected,
            COALESCE(SUM(a.status = 'BOOKED' AND a.appt_datetime > NOW()), 0) AS upcomingAppointments
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.id
      WHERE d.id = ?
      GROUP BY d.id, d.full_name`,
    [id]
  );
  return rows[0] || null;
}

// One row per day for the next `days` days (today included), zero-filled,
// with each day's utilization against the daily cap.
async function getDailyCounts(id, days, dailyCap) {
  const [rows] = await pool.execute(
    `WITH RECURSIVE calendar (day, n) AS (
         SELECT CURDATE(), 1
         UNION ALL
         SELECT day + INTERVAL 1 DAY, n + 1 FROM calendar WHERE n < ?
     )
     SELECT calendar.day AS date,
            COUNT(a.id) AS appointments,
            ROUND(COUNT(a.id) / ? * 100, 1) AS utilizationPercent
       FROM calendar
       LEFT JOIN appointments a
              ON a.doctor_id = ?
             AND a.status = 'BOOKED'
             AND a.appt_datetime >= calendar.day
             AND a.appt_datetime < calendar.day + INTERVAL 1 DAY
      GROUP BY calendar.day
      ORDER BY calendar.day`,
    [days, dailyCap, id]
  );
  return rows;
}

// Utilization over the whole window: booked slots / (days x daily cap).
async function getWindowUtilization(id, days, dailyCap) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS bookedSlots,
            ? * ? AS capacity,
            ROUND(COUNT(*) / (? * ?) * 100, 1) AS utilizationPercent
       FROM appointments
      WHERE doctor_id = ?
        AND status = 'BOOKED'
        AND appt_datetime >= CURDATE()
        AND appt_datetime < CURDATE() + INTERVAL ? DAY`,
    [days, dailyCap, days, dailyCap, id, days]
  );
  return rows[0];
}

module.exports = {
  findAll,
  findById,
  findByIdForUpdate,
  create,
  update,
  remove,
  getSummaryStats,
  getDailyCounts,
  getWindowUtilization,
};
