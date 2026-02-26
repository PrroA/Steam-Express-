const runtime = require('./server-build/server.js');

if (require.main === module && typeof runtime.startServer === 'function') {
  runtime.startServer();
}

module.exports = runtime.app || runtime.default || runtime;

