const dashboardService = require('../services/dashboardService');

async function resumo(req, res, next) {
  try {
    const result = await dashboardService.resumo(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  resumo
};
