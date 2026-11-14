const AppError = require('../utils/AppError');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const queue = require('../services/queue');
const { parseId } = require('../utils/validators');
const { isValidDateOnly, toSqlDate } = require('../utils/datetime');

// Redis being unreachable is a temporary service problem, not a client error.
async function callRedis(operation) {
  try {
    return await operation();
  } catch (err) {
    console.error(`[redis] waitlist operation failed: ${err.message}`);
    throw new AppError(503, 'The waitlist is temporarily unavailable. Please try again shortly.');
  }
}

function readWaitlistTarget(source) {
  const doctorId = parseId(source.doctorId);
  const date = source.date;
  const errors = [];
  if (doctorId === null) errors.push('doctorId is required and must be a positive whole number');
  if (!isValidDateOnly(date)) errors.push('date is required in the format YYYY-MM-DD');
  if (errors.length > 0) throw new AppError(400, 'Validation failed', { errors });
  return { doctorId, date };
}

async function joinWaitlist(req, res) {
  const body = req.body || {};
  const { doctorId, date } = readWaitlistTarget(body);
  const patientId = parseId(body.patientId);
  if (patientId === null) {
    throw new AppError(400, 'Validation failed', { errors: ['patientId is required and must be a positive whole number'] });
  }
  if (date < toSqlDate(new Date())) throw new AppError(422, 'You cannot join the waitlist for a past date');

  const [patient, doctor] = await Promise.all([patientModel.findById(patientId), doctorModel.findById(doctorId)]);
  if (!patient) throw new AppError(404, `Patient ${patientId} not found`);
  if (!doctor) throw new AppError(404, `Doctor ${doctorId} not found`);

  const result = await callRedis(() =>
    queue.joinWaitlist({ patientId, doctorId, date, preferredTime: body.preferredTime })
  );
  if (!result.added) {
    throw new AppError(409, `Patient ${patientId} is already on this waitlist (position ${result.position})`);
  }
  res.status(201).json({
    message: `Added to ${doctor.fullName}'s waitlist for ${date}. You will be booked automatically if a slot frees up.`,
    position: result.position,
    entry: result.entry,
  });
}

async function getWaitlist(req, res) {
  const { doctorId, date } = readWaitlistTarget(req.query);
  const entries = await callRedis(() => queue.getWaitlist(doctorId, date));
  res.json({ doctorId, date, length: entries.length, entries });
}

module.exports = { joinWaitlist, getWaitlist };
