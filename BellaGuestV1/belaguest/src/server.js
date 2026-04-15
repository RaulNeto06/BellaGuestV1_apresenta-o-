const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./config/socket');

const server = http.createServer(app);

initSocket(server);

server.listen(env.PORT, () => {
  console.log(`BelaGuest API rodando na porta ${env.PORT}`);
});
