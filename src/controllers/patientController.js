const AppError = require('../utils/AppError');
const patientModel = require('../models/patientModel');
const { validatePatient } = require('../utils/validators');
const { requireId, throwIfInvalid } = require('./helpers');

async function listPatients(req, res) {
  res.json(await patientModel.findAll());
}

async function getPatient(req, res) {
  const id = requireId(req.params.id, 'patient id');
  const patient = await patientModel.findById(id);
  if (!patient) throw new AppError(404, `Patient ${id} not found`);
  res.json(patient);
}

async function createPatient(req, res) {
  const { errors, value } = validatePatient(req.body);
  throwIfInvalid(errors);
  const patient = await patientModel.create(value);
  res.status(201).location(`/api/patients/${patient.id}`).json(patient);
}

async function updatePatient(req, res) {
  const id = requireId(req.params.id, 'patient id');
  const { errors, value } = validatePatient(req.body);
  throwIfInvalid(errors);
  const patient = await patientModel.update(id, value);
  if (!patient) throw new AppError(404, `Patient ${id} not found`);
  res.json(patient);
}

async function deletePatient(req, res) {
  const id = requireId(req.params.id, 'patient id');
  const deleted = await patientModel.remove(id);
  if (!deleted) throw new AppError(404, `Patient ${id} not found`);
  res.status(204).end();
}

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient };
