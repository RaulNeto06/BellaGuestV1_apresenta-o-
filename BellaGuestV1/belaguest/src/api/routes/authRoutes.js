const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../../middlewares/authMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { registerValidator, loginValidator } = require('../validators/validators');

const router = express.Router();

router.post('/register', registerValidator, validateRequest, authController.register);
router.post('/login', loginValidator, validateRequest, authController.login);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
