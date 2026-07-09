import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { createSubscriptionSchema, updateSubscriptionSchema, validate } from '../validation.js';

export async function subscriptionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', {
    schema: { security: [{ bearerAuth: [] }], response: { 200: { type: 'array' } } },
  }, async (request: any) => {
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

  app.get('/:id', {
    schema: { security: [{ bearerAuth: [] }], response: { 200: { type: 'object' } } },
  }, async (request: any, reply: any) => {
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

  app.post('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object', required: ['name', 'amount', 'category_id', 'next_payment_date'],
        properties: {
          name: { type: 'string', description: 'Название подписки' },
          amount: { type: 'number', description: 'Сумма' },
          currency: { type: 'string', enum: ['RUB', 'USD', 'EUR'], default: 'RUB' },
          period: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' },
          next_payment_date: { type: 'string', format: 'date', description: 'Дата списания (YYYY-MM-DD)' },
          category_id: { type: 'integer', description: 'ID категории' },
        },
      },
      response: { 201: { type: 'object' } },
    },
  }, async (request: any, reply: any) => {
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

  app.put('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', enum: ['RUB', 'USD', 'EUR'] },
          period: { type: 'string', enum: ['monthly', 'yearly'] },
          next_payment_date: { type: 'string', format: 'date' },
          category_id: { type: 'integer', nullable: true },
          review_flag: { type: 'boolean' },
        },
      },
      response: { 200: { type: 'object' } },
    },
  }, async (request: any, reply: any) => {
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

  app.delete('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' } } } },
    },
  }, async (request: any, reply: any) => {
    const { rowCount } = await pool.query(
      'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2',
      [Number(request.params.id), request.user.id]
    );
    if (!rowCount) return reply.status(404).send({ error: 'Not found' });
    return { success: true };
  });

  app.patch('/:id/review', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      response: { 200: { type: 'object' } },
    },
  }, async (request: any, reply: any) => {
    const { rows } = await pool.query(
      `UPDATE subscriptions SET review_flag = NOT review_flag, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [Number(request.params.id), request.user.id]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Not found' });
    return rows[0];
  });
}
