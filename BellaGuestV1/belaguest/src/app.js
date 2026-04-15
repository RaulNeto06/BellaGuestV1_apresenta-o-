const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('./config/database');
const routes = require('./api/routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1', routes);

app.get('/health', async (_, res) => {
  const databaseOk = await testConnection();

  return res.status(databaseOk ? 200 : 500).json({
    status: databaseOk ? 'ok' : 'degraded',
    service: 'BelaGuest API',
    database: databaseOk ? 'connected' : 'disconnected'
  });
});

app.use(errorHandler);

module.exports = app;
