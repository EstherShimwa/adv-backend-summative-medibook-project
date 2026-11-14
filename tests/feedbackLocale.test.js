const { resolveLang } = require('../src/controllers/feedbackController');

describe('feedback page language selection', () => {
  test('supported languages are used, case-insensitively', () => {
    expect(resolveLang('fr')).toBe('fr');
    expect(resolveLang('FR')).toBe('fr');
  });

  test('missing or unsupported values fall back to English', () => {
    expect([undefined, '', 'xx', ['fr'], 'constructor'].map(resolveLang)).toEqual(['en', 'en', 'en', 'en', 'en']);
  });
});
