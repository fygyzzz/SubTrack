import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { createSubscriptionSchema, updateSubscriptionSchema, validate } from '../validation.js';

export async function subscriptionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', async (request: any) => {
    const { rows } = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon,
        (s.review_flag OR (s.created_at < NOW() - INTERVAL '6 months' AND s.updated_at = s.created_at) OR (s.next_payment_date < NOW() - INTERVAL '1 month')) as suggested_review
       FROM subscriptions s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.user_id = $1
       ORDER BY s.next_payment_date ASC`,
      [request.user.id]
    );
    return rows;
  });

  app.get('/:id', async (request: any, reply: any) => {
    const { rows } = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon
       FROM subscriptions s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.id = $1 AND s.user_id = $2`,
      [Number(request.params.id), request.user.id]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Not found' });
    return rows[0];
  });

  app.post('/', async (request: any, reply: any) => {
    const data = validate(createSubscriptionSchema, request.body, reply);
    if (!data) return;

    const { rows } = await pool.query(
      `INSERT INTO subscriptions (user_id, category_id, name, amount, currency, period, next_payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [request.user.id, data.category_id || null, data.name, data.amount, data.currency, data.period, data.next_payment_date]
    );
    return reply.status(201).send(rows[0]);
  });

  app.put('/:id', async (request: any, reply: any) => {
    const data = validate(updateSubscriptionSchema, request.body, reply);
    if (!data) return;

    const { rows } = await pool.query(
      `UPDATE subscriptions SET
        name = COALESCE($1, name),
        amount = COALESCE($2, amount),
        currency = COALESCE($3, currency),
        period = COALESCE($4, period),
        next_payment_date = COALESCE($5, next_payment_date),
        category_id = COALESCE($6, category_id),
        review_flag = COALESCE($7, review_flag),
        updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [data.name, data.amount, data.currency, data.period, data.next_payment_date, data.category_id ?? null, data.review_flag, Number(request.params.id), request.user.id]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Not found' });
    return rows[0];
  });

  app.delete('/:id', async (request: any, reply: any) => {
    const { rowCount } = await pool.query(
      'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2',
      [Number(request.params.id), request.user.id]
    );
    if (!rowCount) return reply.status(404).send({ error: 'Not found' });
    return { success: true };
  });

  app.patch('/:id/review', async (request: any, reply: any) => {
    const { rows } = await pool.query(
      `UPDATE subscriptions SET review_flag = NOT review_flag, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [Number(request.params.id), request.user.id]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Not found' });
    return rows[0];
  });
}
