// Pure input validators. Each returns { errors: string[], value: object }.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const ROOM_PATTERN = /^[A-Za-z0-9-]{1,10}$/;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function checkName(errors, field, value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 100) {
    errors.push(`${field} is required and must be 2-100 characters`);
  }
}

function validatePatient(body = {}) {
  const value = {
    fullName: cleanString(body.fullName),
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email,
    phone: cleanString(body.phone),
  };
  const errors = [];
  checkName(errors, 'fullName', value.fullName);
  if (typeof value.email !== 'string' || value.email.length > 255 || !EMAIL_PATTERN.test(value.email)) {
    errors.push('email is required and must be a valid email address');
  }
  if (typeof value.phone !== 'string' || !PHONE_PATTERN.test(value.phone)) {
    errors.push('phone is required: 7-20 characters of digits, spaces, +, -, ( or )');
  }
  return { errors, value };
}

function validateDoctor(body = {}) {
  const value = {
    fullName: cleanString(body.fullName),
    specialty: cleanString(body.specialty),
    consultationFee: body.consultationFee,
    room: cleanString(body.room),
  };
  const errors = [];
  checkName(errors, 'fullName', value.fullName);
  if (typeof value.specialty !== 'string' || value.specialty.length < 2 || value.specialty.length > 100) {
    errors.push('specialty is required and must be 2-100 characters');
  }
  if (!MONEY_PATTERN.test(String(value.consultationFee ?? ''))) {
    errors.push('consultationFee is required: a non-negative amount with at most 2 decimals (e.g. 150.00)');
  } else {
    value.consultationFee = Number(value.consultationFee);
  }
  if (typeof value.room !== 'string' || !ROOM_PATTERN.test(value.room)) {
    errors.push('room is required: up to 10 letters, digits or dashes (e.g. R-12)');
  }
  return { errors, value };
}

// Returns a positive integer id, or null if the value is not one.
function parseId(value) {
  const text = String(value ?? '');
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = { validatePatient, validateDoctor, parseId };
