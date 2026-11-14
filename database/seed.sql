-- MediBook sample data. Run after schema.sql.
-- Future appointments use dates relative to CURDATE() so the demo data
-- always lies in the future, whenever the script is run.
USE medibook;

INSERT INTO patients (full_name, email, phone) VALUES
  ('Ama Mensah',     'ama@mail.com',     '0244-111-222'),
  ('Kojo Owusu',     'kojo@mail.com',    '0555-333-444'),
  ('Esi Asante',     'esi@mail.com',     '0201-555-666'),
  ('Yaw Darko',      'yaw@mail.com',     '0277-777-888'),
  ('Abena Boakye',   'abena@mail.com',   '0244-999-000'),
  ('Kwesi Appiah',   'kwesi@mail.com',   '0501-121-314'),
  ('Akua Sarpong',   'akua@mail.com',    '0266-151-617'),
  ('Kofi Antwi',     'kofi@mail.com',    '0548-181-920');

INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES
  ('Dr. Boateng', 'Dermatology',      150.00, 'R-12'),
  ('Dr. Adjei',   'Paediatrics',      100.00, 'R-03'),
  ('Dr. Nkrumah', 'General Practice',  80.00, 'R-07');  -- has no appointments

-- The three rows from the original spreadsheet (past appointments).
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  (1, 1, '2026-08-10 09:00:00', 150.00, '2026-07-01 00:00:00'),
  (2, 1, '2026-08-10 09:30:00', 120.00, '2026-07-02 00:00:00'),
  (1, 2, '2026-08-15 10:00:00', 100.00, '2026-07-03 00:00:00');

-- A past cancellation, kept for refund history (full refund: > 48 h notice).
INSERT INTO appointments
  (patient_id, doctor_id, appt_datetime, amount_paid, booked_on,
   status, cancelled_at, refund_percent, refund_amount)
VALUES
  (3, 2, '2026-09-01 11:00:00', 100.00, '2026-08-20 10:00:00',
   'CANCELLED', '2026-08-28 09:00:00', 100, 100.00);

-- Near-cap day: Dr. Boateng has 11 of 12 slots booked, 4 days from today.
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '09:00:00'), 150.00, NOW() - INTERVAL 5 DAY),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '09:30:00'), 150.00, NOW() - INTERVAL 5 DAY),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '10:00:00'), 150.00, NOW() - INTERVAL 4 DAY),
  (4, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '10:30:00'), 150.00, NOW() - INTERVAL 4 DAY),
  (5, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '11:00:00'), 150.00, NOW() - INTERVAL 3 DAY),
  (6, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '11:30:00'), 150.00, NOW() - INTERVAL 3 DAY),
  (7, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '12:00:00'), 150.00, NOW() - INTERVAL 2 DAY),
  (8, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '13:00:00'), 150.00, NOW() - INTERVAL 2 DAY),
  (1, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '14:00:00'), 150.00, NOW() - INTERVAL 1 DAY),
  (2, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '15:00:00'), 150.00, NOW() - INTERVAL 1 DAY),
  (3, 1, TIMESTAMP(CURDATE() + INTERVAL 4 DAY, '16:00:00'), 150.00, NOW() - INTERVAL 1 DAY);

-- A few more upcoming appointments for Dr. Adjei.
INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, booked_on) VALUES
  (4, 2, TIMESTAMP(CURDATE() + INTERVAL 2 DAY, '10:00:00'), 100.00, NOW() - INTERVAL 2 DAY),
  (5, 2, TIMESTAMP(CURDATE() + INTERVAL 3 DAY, '09:30:00'), 100.00, NOW() - INTERVAL 1 DAY),
  (6, 2, TIMESTAMP(CURDATE() + INTERVAL 6 DAY, '14:30:00'), 100.00, NOW());
