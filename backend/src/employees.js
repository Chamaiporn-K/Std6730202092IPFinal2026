const express = require('express');
const {randomBytes} = require('node:crypto');
const {clusterSalaries} = require('./salary-clusters');
const columns = 'ChaKon_id AS id, ChaKon_employee_code AS employee_code, ChaKon_first_name AS first_name, ChaKon_last_name AS last_name, ChaKon_position AS position, ChaKon_status AS status, ChaKon_salary AS salary';
function serialize(row) { return {...row, id: String(row.id), name: `${row.first_name} ${row.last_name}`, salary: Number(row.salary)}; }
function validId(value) { return /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 4294967295; }
function namePrefix(name) {
  const letters = name.replace(/[^a-z]/gi, '').slice(0, 3).toLowerCase();
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}
function createEmployeesRouter(pool, requireAuth) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/salary-clusters', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT ChaKon_salary AS salary FROM employees');
      res.json({success: true, clusters: clusterSalaries(rows.map(row => Number(row.salary)))});
    } catch (err) { next(err); }
  });
  router.get('/', async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT ${columns} FROM employees ORDER BY ChaKon_id DESC`);
      res.json(rows.map(serialize));
    } catch (err) { next(err); }
  });
  router.post('/', async (req, res, next) => {
    const body = req.body || {};
    const first = typeof body.first_name === 'string' ? body.first_name.trim() : '';
    const last = typeof body.last_name === 'string' ? body.last_name.trim() : '';
    const position = typeof body.position === 'string' ? body.position.trim() : '';
    if (!first || !last || !position || first.length > 100 || last.length > 100 || position.length > 150) return res.status(400).json({error: 'First name, last name and position are required (max 100, 100 and 150 characters).'});
    const namePattern = /^[A-Za-z][A-Za-z '\-]*$/;
    if (!namePattern.test(first) || !namePattern.test(last)) return res.status(400).json({error: 'Use English letters for first and last name; spaces, apostrophes and hyphens are allowed.'});
    const rawSalary = typeof body.salary === 'number' || typeof body.salary === 'string' ? String(body.salary).trim() : '';
    const salary = Number(rawSalary);
    if (!/^\d+(\.\d{1,2})?$/.test(rawSalary) || !Number.isFinite(salary) || salary > 9999999999.99) return res.status(400).json({error: 'Salary must be between 0 and 9,999,999,999.99 with at most 2 decimal places.'});
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const temporaryCode = `tmp_${randomBytes(10).toString('hex')}`;
      const [result] = await connection.query("INSERT INTO employees (ChaKon_employee_code, ChaKon_first_name, ChaKon_last_name, ChaKon_position, ChaKon_status, ChaKon_salary) VALUES (?, ?, ?, ?, 'Active', ?)", [temporaryCode, first, last, position, salary]);
      const code = `${namePrefix(first)}${namePrefix(last)}_${String(result.insertId).padStart(3, '0')}`;
      await connection.query('UPDATE employees SET ChaKon_employee_code = ? WHERE ChaKon_id = ?', [code, result.insertId]);
      const [rows] = await connection.query(`SELECT ${columns} FROM employees WHERE ChaKon_id = ?`, [result.insertId]);
      await connection.commit();
      res.status(201).json(serialize(rows[0]));
    } catch (err) {
      if (connection) await connection.rollback().catch(() => {});
      next(err);
    } finally { if (connection) connection.release(); }
  });
  router.put('/:id/status', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid employee ID'});
    try {
      const [result] = await pool.query("UPDATE employees SET ChaKon_status = CASE WHEN ChaKon_status = 'Active' THEN 'On Leave' ELSE 'Active' END WHERE ChaKon_id = ?", [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({error: 'Employee not found'});
      res.json({success: true});
    } catch (err) { next(err); }
  });
  router.delete('/:id', async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid employee ID'});
    try {
      const [result] = await pool.query('DELETE FROM employees WHERE ChaKon_id = ?', [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({error: 'Employee not found'});
      res.json({success: true});
    } catch (err) { next(err); }
  });
  return router;
}
module.exports = {createEmployeesRouter};
