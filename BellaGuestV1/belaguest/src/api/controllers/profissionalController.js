const profissionalService = require('../services/profissionalService');

async function create(req, res, next) {
  try {
    const result = await profissionalService.create(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await profissionalService.list();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function detail(req, res, next) {
  try {
    const result = await profissionalService.detail(Number(req.params.id));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await profissionalService.detailByUserId(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await profissionalService.update(Number(req.params.id), req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateMyAvailability(req, res, next) {
  try {
    const result = await profissionalService.updateAvailabilityByUserId(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await profissionalService.remove(Number(req.params.id));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateMyServices(req, res, next) {
  try {
    const result = await profissionalService.updateServicosByUserId(req.user.id, req.body.idsServicos);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getMyServices(req, res, next) {
  try {
    const profissional = await profissionalService.detailByUserId(req.user.id);
    return res.status(200).json(profissional.servicos);
  } catch (error) {
    return next(error);
  }
}
module.exports = {
  create,
  list,
  detail,
  me,
  update,
  updateMyAvailability,
  updateMyServices,
  getMyServices,
  remove
};
