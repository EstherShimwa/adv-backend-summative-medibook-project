const { Router } = require('express');
const controller = require('../controllers/feedbackController');

const router = Router();

router.get('/', controller.showFeedbackForm);

module.exports = router;
