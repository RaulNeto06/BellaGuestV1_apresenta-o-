const userService = require('../services/userService');

async function list(req, res, next) {
  try {
    const result = await userService.listAdminUsers();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await userService.updateUserByAdmin(Number(req.params.id), req.body, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  update
};
