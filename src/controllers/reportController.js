const reportModel = require('../models/reportModel');
const { MAX_APPOINTMENTS_PER_DAY, BUSY_DAY_THRESHOLD } = require('../config/constants');

async function doctorsReport(req, res) {
  res.json(await reportModel.getDoctorsReport());
}

async function busyDaysReport(req, res) {
  const rows = await reportModel.getBusyDays(MAX_APPOINTMENTS_PER_DAY, BUSY_DAY_THRESHOLD);
  res.json({
    rule: `More than ${BUSY_DAY_THRESHOLD * 100}% of ${MAX_APPOINTMENTS_PER_DAY} daily slots booked`,
    busyDays: rows,
  });
}

module.exports = { doctorsReport, busyDaysReport };
