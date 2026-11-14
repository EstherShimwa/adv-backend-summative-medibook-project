const { pool } = require('../config/db');

const COLUMNS = 'id, full_name AS fullName, email, phone, created_at AS createdAt';

async function findAll() {
  const [rows] = await pool.execute(`SELECT ${COLUMNS} FROM patients ORDER BY id`);
  return rows;
}

async function findById(id, connection = pool) {
  const [rows] = await connection.execute(`SELECT ${COLUMNS} FROM patients WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function create({ fullName, email, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [fullName, email, phone]
  );
  return findById(result.insertId);
}

// Returns the updated patient, or null if the id does not exist.
async function update(id, { fullName, email, phone }) {
  const [result] = await pool.execute(
    'UPDATE patients SET full_name = ?, email = ?, phone = ? WHERE id = ?',
    [fullName, email, phone, id]
  );
  return result.affectedRows === 0 ? null : findById(id);
}

// Returns true if a row was deleted.
async function remove(id) {
  const [result] = await pool.execute('DELETE FROM patients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
