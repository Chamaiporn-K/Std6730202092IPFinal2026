require('dotenv').config({path: require('node:path').join(__dirname, '.env'), quiet: true});
const { createPool } = require('./src/db');
const { createApp } = require('./src/app');
async function start() {
  const pool = createPool();
  try {
    const {app, ensureAuthTables} = createApp(pool, process.env.JWT_SECRET);
    await pool.query('SELECT 1');
    await ensureAuthTables();
    const server = app.listen(process.env.PORT || 3012, '0.0.0.0', () => console.log('API ready'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
    return server;
  } catch (err) { await pool.end(); throw err; }
}
if (require.main === module) start().catch(err => { console.error('Startup failed:', err.code || err.message); process.exitCode = 1; });
module.exports = { start };
