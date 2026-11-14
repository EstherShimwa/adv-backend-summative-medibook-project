const { validatePatient, validateDoctor, parseId } = require('../src/utils/validators');

describe('input validators', () => {
  test('a valid patient passes and the email is normalised', () => {
    const { errors, value } = validatePatient({ fullName: ' Ama Mensah ', email: 'AMA@Mail.com', phone: '0244-111-222' });
    expect(errors).toEqual([]);
    expect(value).toEqual({ fullName: 'Ama Mensah', email: 'ama@mail.com', phone: '0244-111-222' });
  });

  test('an empty patient body reports every missing field', () => {
    expect(validatePatient({}).errors).toHaveLength(3);
  });

  test('a doctor fee must be non-negative with at most 2 decimals', () => {
    const base = { fullName: 'Dr. Adjei', specialty: 'Paediatrics', room: 'R-03' };
    expect(validateDoctor({ ...base, consultationFee: '100.00' }).errors).toEqual([]);
    expect(validateDoctor({ ...base, consultationFee: -5 }).errors).toHaveLength(1);
    expect(validateDoctor({ ...base, consultationFee: '10.999' }).errors).toHaveLength(1);
  });

  test('parseId only accepts positive whole numbers', () => {
    expect(parseId('7')).toBe(7);
    expect([0, -1, '1.5', 'abc', '', undefined].map(parseId)).toEqual([null, null, null, null, null, null]);
  });
});
