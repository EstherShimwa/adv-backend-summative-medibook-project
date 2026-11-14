const express = require('express');
const apiRoutes = require('./routes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'MediBook API', docs: 'See README.md', feedback: '/feedback' });
});
app.use('/api', apiRoutes);
app.use('/feedback', feedbackRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
