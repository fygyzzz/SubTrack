import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { security: [{ bearerAuth: [] }] },
    onRequest: [app.authenticate],
  }, async () => {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY id');
    return rows;
  });
}
