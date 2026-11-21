// Builds the feedback page HTML. All visible text comes from the locale object.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFeedbackPage({ lang, otherLang, text, formattedDate }) {
  const questions = text.questions
    .map(
      (question, i) => `
      <div class="question">
        <label for="q${i + 1}">${i + 1}. ${escapeHtml(question)}</label>
        <textarea id="q${i + 1}" name="q${i + 1}" rows="6" required>${escapeHtml((text.answers || [])[i] || '')}</textarea>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(text.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #222; }
    header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 1rem; }
    .date { color: #555; }
    .question { margin: 1.25rem 0; }
    label { display: block; font-weight: 600; margin-bottom: .4rem; }
    textarea { width: 100%; box-sizing: border-box; padding: .5rem; font: inherit; }
    button { padding: .6rem 1.2rem; font: inherit; cursor: pointer; }
    #thanks { color: #1a7f37; font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(text.title)}</h1>
    <a href="/feedback?lang=${escapeHtml(otherLang)}">${escapeHtml(text.switchLanguage)}</a>
  </header>
  <p class="date">${escapeHtml(text.dateLabel)}: <strong>${escapeHtml(formattedDate)}</strong></p>
  <p>${escapeHtml(text.instructions)}</p>
  <form id="feedback-form">
    ${questions}
    <button type="submit">${escapeHtml(text.submit)}</button>
    <p id="thanks" hidden>${escapeHtml(text.thanks)}</p>
  </form>
  <script>
    document.getElementById('feedback-form').addEventListener('submit', function (event) {
      event.preventDefault();
      document.getElementById('thanks').hidden = false;
    });
  </script>
</body>
</html>`;
}

module.exports = { renderFeedbackPage };
