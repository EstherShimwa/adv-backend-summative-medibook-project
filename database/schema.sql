-- MediBook clinic appointment system: schema (3NF, exactly 3 tables)
-- Run on a fresh MySQL 8.0.16+ server (CHECK constraints are enforced from 8.0.16).

DROP DATABASE IF EXISTS medibook;
CREATE DATABASE medibook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook;

-- One row per patient. Contact details live here only (no repetition per booking).
CREATE TABLE patients (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  phone       VARCHAR(20)   NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_patients PRIMARY KEY (id),
  CONSTRAINT uq_patients_email UNIQUE (email),
  CONSTRAINT chk_patients_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 2),
  CONSTRAINT chk_patients_email CHECK (email LIKE '%_@_%._%')
) ENGINE = InnoDB;

-- One row per doctor. Specialty, fee and room depend only on the doctor.
CREATE TABLE doctors (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(100)   NOT NULL,
  specialty         VARCHAR(100)   NOT NULL,
  consultation_fee  DECIMAL(10,2)  NOT NULL,
  room              VARCHAR(10)    NOT NULL,
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_doctors PRIMARY KEY (id),
  CONSTRAINT chk_doctors_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 2),
  CONSTRAINT chk_doctors_fee CHECK (consultation_fee >= 0)
) ENGINE = InnoDB;

-- One row per booking. Links a patient to a doctor at a 30-minute slot.
-- Cancelled bookings are kept (status = 'CANCELLED') for refund history.
CREATE TABLE appointments (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  patient_id      INT UNSIGNED   NOT NULL,
  doctor_id       INT UNSIGNED   NOT NULL,
  appt_datetime   DATETIME       NOT NULL,
  amount_paid     DECIMAL(10,2)  NOT NULL,
  status          ENUM('BOOKED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
  booked_on       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at    DATETIME       NULL,
  refund_percent  TINYINT UNSIGNED NULL,
  refund_amount   DECIMAL(10,2)  NULL,
  -- Equals appt_datetime while the booking is active, NULL once cancelled.
  -- UNIQUE ignores NULLs, so a cancelled slot can be booked again
  -- while two active bookings for the same doctor/time are impossible.
  active_slot     DATETIME GENERATED ALWAYS AS
                    (IF(status = 'BOOKED', appt_datetime, NULL)) STORED,
  CONSTRAINT pk_appointments PRIMARY KEY (id),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  -- A doctor can never hold two active appointments at the same date/time.
  CONSTRAINT uq_doctor_active_slot UNIQUE (doctor_id, active_slot),
  -- A patient can never be in two places at once.
  CONSTRAINT uq_patient_active_slot UNIQUE (patient_id, active_slot),
  CONSTRAINT chk_slot_boundary
    CHECK (MINUTE(appt_datetime) IN (0, 30) AND SECOND(appt_datetime) = 0),
  CONSTRAINT chk_working_hours
    CHECK (TIME(appt_datetime) BETWEEN '09:00:00' AND '16:30:00'),
  CONSTRAINT chk_amount_paid CHECK (amount_paid >= 0),
  CONSTRAINT chk_refund_percent CHECK (refund_percent IS NULL OR refund_percent IN (0, 50, 100)),
  CONSTRAINT chk_refund_amount
    CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount_paid)),
  CONSTRAINT chk_cancellation_record CHECK (
    (status = 'BOOKED' AND cancelled_at IS NULL AND refund_percent IS NULL AND refund_amount IS NULL)
    OR
    (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND refund_percent IS NOT NULL AND refund_amount IS NOT NULL)
  ),
  INDEX idx_appointments_doctor_datetime (doctor_id, appt_datetime)
) ENGINE = InnoDB;
