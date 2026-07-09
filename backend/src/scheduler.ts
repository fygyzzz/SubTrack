import { pool } from './db/pool.js';
import nodemailer from 'nodemailer';
import { env } from './config.js';
import { getRates } from './currency.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

const FORMAT_RUB = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const PERIOD_LABEL: Record<string, string> = {
  monthly: 'ежемесячно',
  yearly: 'ежегодно',
};

export async function checkAndNotifyForUser(userId: number) {
  if (!env.SMTP_USER || !env.SMTP_PASS) return;
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT s.*, u.email, u.name as user_name
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.next_payment_date = $2`,
      [userId, dateStr]
    );

    if (rows.length === 0) return;

    const { rows: sentRows } = await pool.query(
      `SELECT subscription_id FROM notifications WHERE subscription_id = ANY($1) AND type = 'email' AND sent_at > NOW() - INTERVAL '1 day'`,
      [rows.map(r => r.id)]
    );
    const alreadyNotified = new Set(sentRows.map(r => r.subscription_id));
    const toNotify = rows.filter(r => !alreadyNotified.has(r.id));
    if (toNotify.length === 0) return;

    await sendEmail(toNotify[0].email, toNotify[0].user_name, toNotify);

    for (const s of toNotify) {
      await pool.query(
        `INSERT INTO notifications (user_id, subscription_id, type) VALUES ($1, $2, 'email')`,
        [userId, s.id]
      );
    }

    console.log(`[SCHEDULER] Sent immediate email to user ${userId} about ${toNotify.length} subscriptions`);
  } catch (err: any) {
    console.error('[SCHEDULER] Error in checkAndNotifyForUser:', err.message || err);
  }
}

export function startScheduler() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('[SCHEDULER] SMTP not configured - email scheduler disabled');
    return;
  }

  setTimeout(checkAndNotify, 60_000);
  setInterval(checkAndNotify, 60 * 60 * 1000);
  console.log('[SCHEDULER] Started (first check in 1 minute, then every hour)');
}

async function checkAndNotify() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT s.*, u.email, u.name as user_name
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.next_payment_date = $1`,
      [dateStr]
    );

    if (rows.length === 0) {
      console.log(`[SCHEDULER] No subscriptions due ${dateStr}`);
      return;
    }

    const allIds = rows.map(r => r.id);
    const { rows: sentRows } = await pool.query(
      `SELECT subscription_id FROM notifications WHERE subscription_id = ANY($1) AND type = 'email' AND sent_at > NOW() - INTERVAL '1 day'`,
      [allIds]
    );
    const alreadyNotified = new Set(sentRows.map(r => r.subscription_id));

    const toNotify = rows.filter(r => !alreadyNotified.has(r.id));
    if (toNotify.length === 0) {
      console.log(`[SCHEDULER] All ${rows.length} subscriptions already notified today`);
      return;
    }

    const byUser: Record<number, { email: string; name: string; subs: any[] }> = {};
    for (const row of toNotify) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { email: row.email, name: row.user_name, subs: [] };
      }
      byUser[row.user_id].subs.push(row);
    }

    for (const id of Object.keys(byUser)) {
      const { email, name, subs } = byUser[Number(id)];
      await sendEmail(email, name, subs);

      for (const s of subs) {
        await pool.query(
          `INSERT INTO notifications (user_id, subscription_id, type) VALUES ($1, $2, 'email')`,
          [Number(id), s.id]
        );
      }
    }

    console.log(`[SCHEDULER] Sent ${Object.keys(byUser).length} emails about ${toNotify.length} subscriptions`);
  } catch (err: any) {
    if (err.code === 'EAUTH') {
      console.error('[SCHEDULER] SMTP auth failed - проверьте SMTP_USER и SMTP_PASS в .env');
    } else {
      console.error('[SCHEDULER] Error:', err.message || err);
    }
  }
}

async function sendEmail(email: string, name: string, subs: any[]) {
  const rates = await getRates();
  const items = subs
    .map(
      (s) => {
        const rub = s.currency === 'RUB' ? Number(s.amount) : Number(s.amount) * (rates[s.currency] || 1);
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${s.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${FORMAT_RUB.format(rub)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${PERIOD_LABEL[s.period] || s.period}</td>
        </tr>`;
      }
    )
    .join('');

  await getTransporter().sendMail({
    from: `"SubTrack" <${env.SMTP_FROM}>`,
    to: email,
    subject: 'SubTrack - завтра списание по подпискам',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin:0 auto;">
        <h2 style="color:#1a1a2e;">SubTrack</h2>
        <p>Привет, <b>${name}</b>!</p>
        <p>Напоминаем: завтра списание по следующим подпискам:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;">Название</th>
              <th style="padding:8px 12px;text-align:right;">Сумма</th>
              <th style="padding:8px 12px;text-align:center;">Период</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;" />
        <p style="color:#9ca3af;font-size:12px;">SubTrack - контроль подписок и регулярных платежей</p>
      </div>
    `,
  });
}
