import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import nodemailer from 'nodemailer';
import { env } from '../config.js';
import { getRates } from '../currency.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/upcoming', {
    schema: { security: [{ bearerAuth: [] }] },
    onRequest: [app.authenticate],
  }, async (request: any) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.amount, s.currency, s.next_payment_date, c.name as category_name
       FROM subscriptions s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.user_id = $1 AND s.next_payment_date = $2
       ORDER BY s.next_payment_date`,
      [request.user.id, dateStr]
    );

    const rates = await getRates();
    return rows.map((s: any) => ({
      ...s,
      rub_amount: s.currency === 'RUB' ? Number(s.amount) : Math.round(Number(s.amount) * (rates[s.currency] || 1) * 100) / 100,
    }));
  });

  app.post('/test-email', {
    schema: { security: [{ bearerAuth: [] }] },
    onRequest: [app.authenticate],
  }, async (request: any, reply: any) => {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      return reply.status(400).send({ error: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in .env' });
    }
    try {
      await transporter.sendMail({
        from: `"SubTrack" <${env.SMTP_FROM}>`,
        to: request.user.email,
        subject: 'SubTrack - тестовое уведомление',
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">SubTrack</h2>
            <p>Привет, <b>${request.user.name}</b>!</p>
            <p>Это тестовое уведомление от SubTrack. В ближайшее время вы начнёте получать напоминания о списаниях по подпискам.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">SubTrack - контроль подписок и регулярных платежей</p>
          </div>
        `,
      });
      return { success: true, message: 'Письмо отправлено на ' + request.user.email };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Ошибка отправки: ' + (err.message || 'неизвестная ошибка') });
    }
  });
}
