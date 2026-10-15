const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
function createAuth(pool, JWT_SECRET) {
  const router = express.Router();
  const USERS_TABLE = 'user';
  function createToken(user) {
    return jwt.sign({sub: user.user_id, username: user.username, role: user.role || 'user'}, JWT_SECRET, {expiresIn: '7d'});
  }
  function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({error: 'Authentication required'});
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { return res.status(401).json({error: 'Invalid or expired token'}); }
  }
  async function ensureAuthTables() {
    await pool.query(`CREATE TABLE IF NOT EXISTS \`${USERS_TABLE}\` (
      ChaKon_user_id INT NOT NULL AUTO_INCREMENT,
      ChaKon_username VARCHAR(100) NOT NULL UNIQUE,
      ChaKon_password VARCHAR(255) NOT NULL,
      ChaKon_email VARCHAR(255) NULL,
      ChaKon_role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      ChaKon_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ChaKon_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  router.post('/auth/register', async (req, res) => {
    try {
      const username = String(req.body?.username ?? '').trim();
      const password = String(req.body?.password ?? '');
      const email = String(req.body?.email ?? '').trim();
      if (!username || !password || !email) return res.status(400).json({error: 'Username, password, and email are required'});
      if (username.length < 3 || password.length < 5) return res.status(400).json({error: 'Username must be at least 3 chars and password at least 5 chars'});
      if (!EMAIL_PATTERN.test(email)) return res.status(400).json({error: 'Please enter a valid email address'});
      const [existing] = await pool.query(`SELECT ChaKon_user_id AS user_id FROM \`${USERS_TABLE}\` WHERE ChaKon_username = ? LIMIT 1`, [username]);
      if (existing.length) return res.status(409).json({error: 'Username already exists'});
      const [existingEmail] = await pool.query(`SELECT ChaKon_user_id AS user_id FROM \`${USERS_TABLE}\` WHERE ChaKon_email = ? LIMIT 1`, [email]);
      if (existingEmail.length) return res.status(409).json({error: 'Email already in use'});
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        `INSERT INTO \`${USERS_TABLE}\` (ChaKon_username, ChaKon_password, ChaKon_email, ChaKon_role) VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, email, 'user']
      );
      const user = {user_id: result.insertId, username, email, role: 'user'};
      res.status(201).json({message: 'User registered successfully', token: createToken(user), user});
    } catch (err) {
      console.error('Register Error:', err.message || err);
      res.status(500).json({error: 'Failed to register user'});
    }
  });
  router.post('/auth/login', async (req, res) => {
    try {
      const username = String(req.body?.username ?? '').trim();
      const password = String(req.body?.password ?? '');
      if (!username || !password) return res.status(400).json({error: 'Username and password are required'});
      const [rows] = await pool.query(
        `SELECT ChaKon_user_id AS user_id, ChaKon_username AS username, ChaKon_password AS password, ChaKon_role AS role FROM \`${USERS_TABLE}\` WHERE ChaKon_username = ? LIMIT 1`, [username]
      );
      const user = rows[0];
      if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({error: 'Invalid username or password'});
      const safeUser = {user_id: user.user_id, username: user.username, role: user.role || 'user'};
      res.json({message: 'Login successful', token: createToken(safeUser), user: safeUser});
    } catch (err) {
      console.error('Login Error:', err.message || err);
      res.status(500).json({error: 'Failed to login'});
    }
  });
  router.get('/auth/me', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT ChaKon_user_id AS user_id, ChaKon_username AS username, ChaKon_role AS role, ChaKon_email AS email, ChaKon_created_at AS created_at FROM \`${USERS_TABLE}\` WHERE ChaKon_user_id = ? LIMIT 1`, [req.user.sub]
      );
      if (!rows[0]) return res.status(404).json({error: 'User not found'});
      res.json({user: rows[0]});
    } catch (err) {
      console.error('Auth Me Error:', err.message || err);
      res.status(500).json({error: 'Failed to load user'});
    }
  });
  router.post('/auth/logout', (req, res) => res.json({success: true, message: 'Logged out successfully'}));
  function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({error: 'Admin access required'});
    next();
  }
  return {router, requireAuth, requireAdmin, ensureAuthTables};
}
module.exports = {createAuth};
