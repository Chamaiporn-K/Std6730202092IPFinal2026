const express = require('express');
const cors = require('cors');
const { createAuth } = require('./auth');
const { createEmployeesRouter } = require('./employees');
function createApp(pool, secret) {
  if (!secret) throw new Error('JWT_SECRET is required');
  const app = express();
  const auth = createAuth(pool, secret);
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.get('/api', (req, res) => res.send('API is running'));
  app.get('/api/health', async (req, res) => {
    try { await pool.query('SELECT 1'); res.json({status: 'ok'}); }
    catch { res.status(503).json({status: 'unavailable'}); }
  });
  app.use('/api', auth.router);
  app.use('/api/employees', createEmployeesRouter(pool, auth.requireAuth));
  app.use((req, res) => res.status(404).json({error: 'Not found'}));
  app.use((err, req, res, next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({error: status === 500 ? 'Internal server error' : 'Invalid request'});
  });
  return {app, ...auth};
}
module.exports = { createApp };
