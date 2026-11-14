const { renderFeedbackPage } = require('../views/feedbackPage');

// Locale files are loaded once at startup, never inside a request.
const LOCALES = {
  en: require('../../locales/en.json'),
  fr: require('../../locales/fr.json'),
};
const DEFAULT_LANG = 'en';

// Any missing or unsupported ?lang= value falls back to English.
function resolveLang(requested) {
  const lang = typeof requested === 'string' ? requested.toLowerCase() : '';
  return Object.hasOwn(LOCALES, lang) ? lang : DEFAULT_LANG;
}

function showFeedbackForm(req, res) {
  const lang = resolveLang(req.query.lang);
  const text = LOCALES[lang];
  const formattedDate = new Intl.DateTimeFormat(text.locale, { dateStyle: 'full' }).format(new Date());
  const otherLang = Object.keys(LOCALES).find((code) => code !== lang);
  res.type('html').send(renderFeedbackPage({ lang, otherLang, text, formattedDate }));
}

module.exports = { showFeedbackForm, resolveLang };
