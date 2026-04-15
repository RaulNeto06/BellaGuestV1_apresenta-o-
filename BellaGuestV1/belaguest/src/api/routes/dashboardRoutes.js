const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.get('/resumo', authMiddleware, roleMiddleware(['ADMINISTRADOR']), dashboardController.resumo);

module.exports = router;
