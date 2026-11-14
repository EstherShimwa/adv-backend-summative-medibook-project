const AppError = require('../utils/AppError');
const doctorModel = require('../models/doctorModel');
const { validateDoctor } = require('../utils/validators');
const { requireId, throwIfInvalid } = require('./helpers');
const { MAX_APPOINTMENTS_PER_DAY, STATS_WINDOW_DAYS } = require('../config/constants');

async function listDoctors(req, res) {
  res.json(await doctorModel.findAll());
}

async function getDoctor(req, res) {
  const id = requireId(req.params.id, 'doctor id');
  const doctor = await doctorModel.findById(id);
  if (!doctor) throw new AppError(404, `Doctor ${id} not found`);
  res.json(doctor);
}

async function createDoctor(req, res) {
  const { errors, value } = validateDoctor(req.body);
  throwIfInvalid(errors);
  const doctor = await doctorModel.create(value);
  res.status(201).location(`/api/doctors/${doctor.id}`).json(doctor);
}

async function updateDoctor(req, res) {
  const id = requireId(req.params.id, 'doctor id');
  const { errors, value } = validateDoctor(req.body);
  throwIfInvalid(errors);
  const doctor = await doctorModel.update(id, value);
  if (!doctor) throw new AppError(404, `Doctor ${id} not found`);
  res.json(doctor);
}

async function deleteDoctor(req, res) {
  const id = requireId(req.params.id, 'doctor id');
  const deleted = await doctorModel.remove(id);
  if (!deleted) throw new AppError(404, `Doctor ${id} not found`);
  res.status(204).end();
}

async function getDoctorStats(req, res) {
  const id = requireId(req.params.id, 'doctor id');
  const summary = await doctorModel.getSummaryStats(id);
  if (!summary) throw new AppError(404, `Doctor ${id} not found`);
  const [next7Days, window] = await Promise.all([
    doctorModel.getDailyCounts(id, STATS_WINDOW_DAYS, MAX_APPOINTMENTS_PER_DAY),
    doctorModel.getWindowUtilization(id, STATS_WINDOW_DAYS, MAX_APPOINTMENTS_PER_DAY),
  ]);
  res.json({
    ...summary,
    dailyCap: MAX_APPOINTMENTS_PER_DAY,
    next7Days,
    utilizationNext7Days: window,
  });
}

module.exports = { listDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor, getDoctorStats };
