const servicoService = require('../services/servicoService');

async function create(req, res, next) {
  try {
    const result = await servicoService.create(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await servicoService.list();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await servicoService.update(Number(req.params.id), req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await servicoService.remove(Number(req.params.id));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  update,
  remove
};
