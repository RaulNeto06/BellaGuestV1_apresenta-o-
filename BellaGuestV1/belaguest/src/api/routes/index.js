const express = require('express');
const authRoutes = require('./authRoutes');
const servicoRoutes = require('./servicoRoutes');
const profissionalRoutes = require('./profissionalRoutes');
const agendamentoRoutes = require('./agendamentoRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/servicos', servicoRoutes);
router.use('/profissionais', profissionalRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/usuarios', userRoutes);

module.exports = router;
