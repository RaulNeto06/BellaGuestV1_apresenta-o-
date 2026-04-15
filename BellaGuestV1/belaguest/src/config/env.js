const dotenv = require('dotenv');

dotenv.config();

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'PORT', 'JWT_SECRET'];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
});

module.exports = {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  PORT: Number(process.env.PORT),
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d'
};
