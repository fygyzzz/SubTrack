import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { getRates } from '../currency.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', { onRequest: [app.authenticate] }, async (request: any) => {
    const { rows } = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon as category_icon
       FROM subscriptions s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.user_id = $1`,
      [request.user.id]
    );

    const rates = await getRates();

    let monthlyRub = 0;
    let yearlyRub = 0;

    for (const sub of rows) {
      const rub = sub.currency === 'RUB' ? Number(sub.amount) : Number(sub.amount) * (rates[sub.currency] || 1);
      if (sub.period === 'monthly') {
        monthlyRub += rub;
        yearlyRub += rub * 12;
      } else {
        yearlyRub += rub;
        monthlyRub += rub / 12;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const futureStr = future.toISOString().split('T')[0];

    const upcoming = rows
      .filter((s: any) => {
        const d = s.next_payment_date instanceof Date ? s.next_payment_date.toISOString().split('T')[0] : s.next_payment_date;
        return d <= futureStr;
      })
      .sort((a: any, b: any) => {
        const da = a.next_payment_date instanceof Date ? a.next_payment_date.toISOString().split('T')[0] : a.next_payment_date;
        const db = b.next_payment_date instanceof Date ? b.next_payment_date.toISOString().split('T')[0] : b.next_payment_date;
        if (da < todayStr && db >= todayStr) return -1;
        if (da >= todayStr && db < todayStr) return 1;
        return da.localeCompare(db);
      });

    const categoryBreakdown: Record<string, number> = {};
    for (const sub of rows) {
      const rub = sub.currency === 'RUB' ? Number(sub.amount) : Number(sub.amount) * (rates[sub.currency] || 1);
      const cat = sub.category_name || 'Другое';
      const amount = sub.period === 'monthly' ? rub : rub / 12;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amount;
    }

    return {
      monthlyTotal: Math.round(monthlyRub * 100) / 100,
      yearlyTotal: Math.round(yearlyRub * 100) / 100,
      upcomingPayments: upcoming.map((s: any) => {
        const dateStr = s.next_payment_date instanceof Date ? s.next_payment_date.toISOString().split('T')[0] : s.next_payment_date;
        return {
          id: s.id,
          name: s.name,
          amount: Number(s.amount),
          currency: s.currency,
          rub_amount: s.currency === 'RUB' ? Number(s.amount) : Math.round(Number(s.amount) * (rates[s.currency] || 1) * 100) / 100,
          next_payment_date: s.next_payment_date,
          overdue: dateStr < todayStr,
          category_name: s.category_name,
          category_icon: s.category_icon,
        };
      }),
      categoryBreakdown,
      totalSubscriptions: rows.length,
      exchangeRates: {
        USD: rates.USD || 90,
        EUR: rates.EUR || 100,
      },
    };
  });
}
