import { FastifyInstance } from 'fastify';
import bcryptjs from 'bcryptjs';
import { pool } from '../db/pool.js';
import { registerSchema, loginSchema, validate } from '../validation.js';
import { checkAndNotifyForUser } from '../scheduler.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request: any, reply: any) => {
    const data = validate(registerSchema, request.body, reply);
    if (!data) return;
    const { email, password, name } = data;

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const hash = await bcryptjs.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name`,
      [email, hash, name]
    );

    const token = app.jwt.sign({ id: rows[0].id, email: rows[0].email, name: rows[0].name });
    checkAndNotifyForUser(rows[0].id);
    return { token, user: rows[0] };
  });

  app.post('/login', async (request: any, reply: any) => {
    const data = validate(loginSchema, request.body, reply);
    if (!data) return;
    const { email, password } = data;

    const { rows } = await pool.query('SELECT id, email, password_hash, name FROM users WHERE email = $1', [email]);
    if (!rows.length) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const match = await bcryptjs.compare(password, rows[0].password_hash);
    if (!match) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = app.jwt.sign({ id: rows[0].id, email: rows[0].email, name: rows[0].name });
    checkAndNotifyForUser(rows[0].id);
    return { token, user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } };
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (request: any) => {
    return request.user;
  });
}
