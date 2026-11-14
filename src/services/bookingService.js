// Booking and cancellation workflows. Used by the API controllers AND the worker,
// so the same rules apply however an appointment is created.
const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const appointmentModel = require('../models/appointmentModel');
const { validateSlot } = require('../utils/slotRules');
const { calculateRefund } = require('../utils/refund');
const { parseLocalDateTime, toSqlDateTime } = require('../utils/datetime');
const { MAX_APPOINTMENTS_PER_DAY, APPOINTMENT_STATUS } = require('../config/constants');
const { audit } = require('../utils/auditLogger');
const queue = require('./queue');

function waitlistOffer(code, message, { patientId, doctorId, sqlDate, sqlDateTime }) {
  return new AppError(409, message, {
    code,
    waitlist: {
      offered: true,
      howToJoin: 'POST /api/waitlist',
      body: { patientId, doctorId, date: sqlDate, preferredTime: sqlDateTime.slice(11, 16) },
    },
  });
}

// Queue failures must never undo or fail a booking that is already committed.
async function enqueueSafely(type, payload) {
  try {
    await queue.enqueueJob(type, payload);
  } catch (err) {
    console.error(`[queue] could not enqueue ${type} job: ${err.message}`);
    audit('JOB_ENQUEUE_FAILED', { jobType: type, payload, error: err.message });
  }
}

async function bookAppointment({ patientId, doctorId, apptDatetime }, { source = 'api', now = new Date() } = {}) {
  const slot = validateSlot(apptDatetime, now);
  if (!slot.ok) throw new AppError(slot.status, slot.message);

  const patient = await patientModel.findById(patientId);
  if (!patient) throw new AppError(404, `Patient ${patientId} not found`, { code: 'PATIENT_NOT_FOUND' });

  const appointment = await withTransaction(async (connection) => {
    // 1. Lock the doctor row: concurrent bookings for this doctor now queue up behind us,
    //    so the daily count below cannot change until we commit (no daily-cap race).
    const doctor = await doctorModel.findByIdForUpdate(connection, doctorId);
    if (!doctor) throw new AppError(404, `Doctor ${doctorId} not found`, { code: 'DOCTOR_NOT_FOUND' });

    // 2. Enforce the 12-per-day cap.
    const booked = await appointmentModel.countActiveForDoctorOnDate(connection, doctorId, slot.sqlDate);
    if (booked >= MAX_APPOINTMENTS_PER_DAY) {
      throw waitlistOffer(
        'DAY_FULLY_BOOKED',
        `${doctor.fullName} already has ${MAX_APPOINTMENTS_PER_DAY} appointments on ${slot.sqlDate}`,
        { patientId, doctorId, ...slot }
      );
    }

    // 3. Insert. The UNIQUE (doctor_id, active_slot) index is the final guard:
    //    if two requests ever reach this point for the same slot, MySQL rejects the second.
    try {
      const id = await appointmentModel.insert(connection, {
        patientId,
        doctorId,
        apptDatetime: slot.sqlDateTime,
        amountPaid: doctor.consultationFee, // price is set by the server, not the client
      });
      return appointmentModel.findById(id, connection);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      if (err.message.includes('uq_patient_active_slot')) {
        throw new AppError(409, 'This patient already has an appointment at that time', { code: 'PATIENT_ALREADY_BOOKED' });
      }
      throw waitlistOffer('SLOT_TAKEN', `${doctor.fullName} is already booked at ${slot.sqlDateTime.slice(0, 16)}`, {
        patientId,
        doctorId,
        ...slot,
      });
    }
  });

  audit('APPOINTMENT_BOOKED', {
    appointmentId: appointment.id,
    patientId,
    doctorId,
    apptDatetime: appointment.apptDatetime,
    amountPaid: appointment.amountPaid,
    source,
  });
  await enqueueSafely(queue.JOB_TYPES.CONFIRMATION, {
    appointmentId: appointment.id,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
    patientEmail: appointment.patientEmail,
    doctorName: appointment.doctorName,
    room: appointment.room,
    apptDatetime: appointment.apptDatetime,
  });
  return appointment;
}

async function cancelAppointment(appointmentId, { now = new Date() } = {}) {
  const result = await withTransaction(async (connection) => {
    // Lock the row so two simultaneous cancels cannot both refund.
    const appt = await appointmentModel.findByIdForUpdate(connection, appointmentId);
    if (!appt) throw new AppError(404, `Appointment ${appointmentId} not found`);
    if (appt.status === APPOINTMENT_STATUS.CANCELLED) {
      throw new AppError(409, 'This appointment is already cancelled');
    }
    const startsAt = parseLocalDateTime(appt.apptDatetime);
    if (startsAt.getTime() <= now.getTime()) {
      throw new AppError(422, 'Appointments that have already started cannot be cancelled');
    }

    const refund = calculateRefund(appt.amountPaid, startsAt, now);
    await appointmentModel.markCancelled(connection, appointmentId, {
      cancelledAt: toSqlDateTime(now),
      refundPercent: refund.refundPercent,
      refundAmount: refund.refundAmount,
    });
    const appointment = await appointmentModel.findById(appointmentId, connection);
    return { appointment, refund };
  });

  const { appointment, refund } = result;
  audit('APPOINTMENT_CANCELLED', {
    appointmentId,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    apptDatetime: appointment.apptDatetime,
    noticeHours: Math.round(refund.noticeHours * 100) / 100,
    refundPercent: refund.refundPercent,
    refundAmount: refund.refundAmount,
  });
  // Tell the worker a slot is free so it can promote the first waitlisted patient.
  await enqueueSafely(queue.JOB_TYPES.SLOT_FREED, {
    doctorId: appointment.doctorId,
    apptDatetime: appointment.apptDatetime,
  });
  return result;
}

module.exports = { bookAppointment, cancelAppointment };
