const AppError = require('../utils/AppError');
const appointmentModel = require('../models/appointmentModel');
const bookingService = require('../services/bookingService');
const { parseId } = require('../utils/validators');
const { requireId } = require('./helpers');

async function bookAppointment(req, res) {
  const body = req.body || {};
  const patientId = parseId(body.patientId);
  const doctorId = parseId(body.doctorId);
  const errors = [];
  if (patientId === null) errors.push('patientId is required and must be a positive whole number');
  if (doctorId === null) errors.push('doctorId is required and must be a positive whole number');
  if (errors.length > 0) throw new AppError(400, 'Validation failed', { errors });

  const appointment = await bookingService.bookAppointment({ patientId, doctorId, apptDatetime: body.apptDatetime });
  res.status(201).location(`/api/appointments/${appointment.id}`).json(appointment);
}

async function getAppointment(req, res) {
  const id = requireId(req.params.id, 'appointment id');
  const appointment = await appointmentModel.findById(id);
  if (!appointment) throw new AppError(404, `Appointment ${id} not found`);
  res.json(appointment);
}

// DELETE cancels: the slot is freed, but the row is kept for refund history.
async function cancelAppointment(req, res) {
  const id = requireId(req.params.id, 'appointment id');
  const { appointment, refund } = await bookingService.cancelAppointment(id);
  res.json({
    message: `Appointment cancelled. Refund: ${refund.refundAmount.toFixed(2)} (${refund.refundPercent}%)`,
    refundAmount: refund.refundAmount,
    refundPercent: refund.refundPercent,
    noticeHours: Math.round(refund.noticeHours * 100) / 100,
    appointment,
  });
}

module.exports = { bookAppointment, getAppointment, cancelAppointment };
